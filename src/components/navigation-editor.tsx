"use client";
import { useState } from "react";
import { DestinationPicker } from "./destination-picker";
import { useMenuReorder } from "./use-menu-reorder";
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
  const sort = useMenuReorder(items, busy, (next) => void persist(next));
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
  function list(parent: string | null): React.ReactNode {
    const siblings = items.filter((i) => i.parentId === parent);
    return (
      <ol className="navigation-items">
        {siblings.map((item) => (
          <li
            key={item.id}
            ref={(node) => sort.registerRow(item.id, node)}
            data-menu-item={item.id}
            data-dragging={sort.drag?.id === item.id || undefined}
            data-drop={sort.marker(item.id)}
          >
            <div className="navigation-item">
              <button
                type="button"
                className="secondary navigation-drag-handle"
                {...sort.handleProps(item)}
              >
                <svg
                  width="20"
                  height="24"
                  viewBox="0 0 20 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {[6, 12, 18].flatMap((y) =>
                    [6, 14].map((x) => (
                      <circle key={x + ":" + y} cx={x} cy={y} r="1.6" />
                    )),
                  )}
                </svg>
              </button>
              <div className="navigation-item-content">
                <strong>{item.label}</strong>
                <p className="muted">
                  <small>
                    {item.destination.kind === "page"
                      ? "Garden page"
                      : item.destination.url}
                  </small>
                </p>
                <div className="actions">
                  <button
                    className="secondary"
                    aria-label={"Edit " + item.label}
                    disabled={busy}
                    onClick={() => {
                      setEditing(item.id);
                      setLabel(item.label);
                      setDestination(item.destination);
                      setParentId(item.parentId ?? "");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="secondary"
                    aria-label={"Remove " + item.label}
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
                    Remove
                  </button>
                </div>
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
          <p id="menu-drag-instructions" className="muted navigation-drag-hint">
            Drag the grip to reorder items within their menu level. Keyboard:
            Space to pick up, arrow keys to move, Enter to drop, Escape to
            cancel.
          </p>
          {items.length ? list(null) : <p>No menu items yet.</p>}
          <span
            className="visually-hidden"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {sort.announcement}
          </span>
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
      {sort.drag?.input === "pointer" && (
        <div
          className="navigation-drag-preview"
          aria-hidden="true"
          style={{
            left: Math.max(
              12,
              Math.min(
                sort.drag.x + 14,
                window.innerWidth - Math.min(260, window.innerWidth * 0.7) - 12,
              ),
            ),
            top: Math.max(
              12,
              Math.min(sort.drag.y + 14, window.innerHeight - 120),
            ),
          }}
        >
          <span aria-hidden="true">⠿</span> {sort.drag.label}
        </div>
      )}
    </>
  );
}
