"use client";
import { useState } from "react";
import { DestinationPicker } from "./destination-picker";
import {
  validDestination,
  type Destination,
  type MenuItem,
} from "@/lib/destinations";
export function NavigationEditor({
  initial,
}: {
  initial: { items: MenuItem[]; version: number };
}) {
  const [items, setItems] = useState(initial.items),
    [version, setVersion] = useState(initial.version),
    [label, setLabel] = useState(""),
    [destination, setDestination] = useState<Destination | null>({
      kind: "page",
      pageId: "",
    }),
    [parentId, setParentId] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [status, setStatus] = useState("Saved"),
    [error, setError] = useState("");
  const busy = status === "Saving…";
  async function persist(next: MenuItem[]) {
    setItems(next);
    setStatus("Saving…");
    setError("");
    try {
      const r = await fetch("/api/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next, version }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setVersion(data.version);
      setStatus("Saved");
      return true;
    } catch (e) {
      setStatus("Not saved");
      setError(
        e instanceof Error
          ? e.message
          : "Could not connect. Your menu changes are still here.",
      );
      return false;
    }
  }
  function reset() {
    setEditing(null);
    setLabel("");
    setDestination({ kind: "page", pageId: "" });
    setParentId("");
  }
  function descendant(id: string, ancestor: string): boolean {
    let current = items.find((i) => i.id === id);
    while (current?.parentId) {
      if (current.parentId === ancestor) return true;
      current = items.find((i) => i.id === current!.parentId);
    }
    return false;
  }
  function move(item: MenuItem, offset: number) {
    const siblings = items.filter((i) => i.parentId === item.parentId),
      index = siblings.findIndex((i) => i.id === item.id),
      other = siblings[index + offset];
    if (!other) return;
    const next = [...items],
      a = items.indexOf(item),
      b = items.indexOf(other);
    [next[a], next[b]] = [next[b], next[a]];
    void persist(next);
  }
  function list(parent: string | null): React.ReactNode {
    const siblings = items.filter((i) => i.parentId === parent);
    return (
      <ol className="navigation-items">
        {siblings.map((item, index) => (
          <li key={item.id}>
            <div className="navigation-item">
              <div>
                <strong>{item.label}</strong>
                <p className="muted">
                  <small>
                    {item.destination.kind === "page"
                      ? "Garden page"
                      : item.destination.url}
                  </small>
                </p>
              </div>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditing(item.id);
                    setLabel(item.label);
                    setDestination(item.destination);
                    setParentId(item.parentId ?? "");
                  }}
                >
                  Edit {item.label}
                </button>
                <button
                  className="secondary"
                  aria-label={"Move " + item.label + " up"}
                  disabled={busy || index === 0}
                  onClick={() => move(item, -1)}
                >
                  ↑
                </button>
                <button
                  className="secondary"
                  aria-label={"Move " + item.label + " down"}
                  disabled={busy || index === siblings.length - 1}
                  onClick={() => move(item, 1)}
                >
                  ↓
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    void persist(
                      items.filter(
                        (i) => i.id !== item.id && !descendant(i.id, item.id),
                      ),
                    );
                    if (editing === item.id) reset();
                  }}
                >
                  Remove {item.label}
                </button>
              </div>
            </div>
            {list(item.id)}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1>Navigation</h1>
          <p className="muted">
            Arrange the paths through your garden. Private pages stay hidden
            from visitors.
          </p>
        </div>
      </div>
      <div className="navigation-workspace">
        <section aria-label="Menu items">
          <h2>Your menu</h2>
          {items.length ? list(null) : <p>No menu items yet.</p>}
          <p role="status" aria-label="Navigation status">
            {status}
          </p>
          {error && (
            <div role="alert">
              <p className="error">{error}</p>
              <button onClick={() => void persist(items)}>
                Retry menu changes
              </button>
            </div>
          )}
        </section>
        <form
          className="settings-card"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!label.trim() || !validDestination(destination)) {
              setError("Enter a label and choose a destination.");
              return;
            }
            const item = {
              id: editing ?? crypto.randomUUID(),
              label: label.trim(),
              parentId: parentId || null,
              destination,
            };
            const success = await persist(
              editing
                ? items.map((i) => (i.id === editing ? item : i))
                : [...items, item],
            );
            if (success) reset();
            else setEditing(item.id);
          }}
        >
          <h2>{editing ? "Edit menu item" : "Add menu item"}</h2>
          <label htmlFor="menu-label">Menu label</label>
          <input
            id="menu-label"
            maxLength={100}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          <DestinationPicker value={destination} onChange={setDestination} />
          <label htmlFor="menu-parent">Parent item</label>
          <select
            id="menu-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Top level</option>
            {items
              .filter(
                (i) =>
                  i.id !== editing && (!editing || !descendant(i.id, editing)),
              )
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
          </select>
          <p className="muted">
            <small>
              Nested items appear beneath their parent. Removing a parent also
              removes its menu children; pages are kept.
            </small>
          </p>
          <button disabled={busy}>
            {editing ? "Update menu item" : "Add menu item"}
          </button>
          {editing && (
            <button className="secondary" type="button" onClick={reset}>
              Cancel editing
            </button>
          )}
        </form>
      </div>
    </>
  );
}
