"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { DestinationPicker } from "./destination-picker";
import {
  validDestination,
  type Destination,
  type MenuItem,
} from "@/lib/destinations";
import {
  isMenuDescendant,
  sameMenuItem,
  type NavigationState,
} from "@/lib/navigation";
import { fetchNavigation, putNavigation } from "@/lib/navigation-client";

export function NavigationItemForm({
  initial,
  item,
  id,
}: {
  initial: NavigationState;
  item?: MenuItem;
  id: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items),
    [label, setLabel] = useState(item?.label ?? ""),
    [destination, setDestination] = useState<Destination | null>(
      item?.destination ?? { kind: "page", pageId: "" },
    ),
    [parentId, setParentId] = useState(item?.parentId ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState<MenuItem | null>(null);
  const expected = useRef(item),
    pending = useRef(false);
  function back() {
    router.push("/admin/navigation");
    router.refresh();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (!label.trim() || !validDestination(destination)) {
      setError("Enter a label and choose a valid destination.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setConflict(null);
    try {
      const latest = await fetchNavigation();
      setItems(latest.items);
      const current = latest.items.find((entry) => entry.id === id);
      const nextItem: MenuItem = {
        id,
        label: label.trim(),
        parentId: parentId || null,
        destination,
      };
      // A lost success response must not create a duplicate or repeat a write.
      if (sameMenuItem(current, nextItem)) {
        back();
        return;
      }
      if (item && !current)
        throw Error(
          "This menu item was removed elsewhere. Your entries are still here; return to Navigation to review the menu.",
        );
      if (current && !sameMenuItem(current, expected.current)) {
        setConflict(current);
        throw Error(
          "This menu item changed elsewhere. Your entries are still here. Review the saved item before making further changes.",
        );
      }
      if (
        parentId &&
        (!latest.items.some((entry) => entry.id === parentId) ||
          parentId === id ||
          isMenuDescendant(latest.items, parentId, id))
      )
        throw Error(
          "Choose an available parent outside this item's own submenu.",
        );
      await putNavigation(
        current
          ? latest.items.map((entry) => (entry.id === id ? nextItem : entry))
          : [...latest.items, nextItem],
        latest.version,
      );
      back();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not connect. Your entries are still here. Try again.",
      );
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        href="/admin/navigation"
        className="navigation-back"
        aria-disabled={busy}
        onClick={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        ← Navigation
      </Link>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your menu</p>
          <h1>{item ? "Edit menu item" : "Add menu item"}</h1>
          <p className="muted">
            Choose its name, destination and place in the menu.
          </p>
        </div>
      </div>
      <form className="settings-card navigation-item-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="navigation-form-field">
            <label htmlFor="menu-label">Menu label</label>
            <input
              id="menu-label"
              maxLength={100}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
            />
          </div>
          <DestinationPicker value={destination} onChange={setDestination} />
          <div className="navigation-form-field">
            <label htmlFor="menu-parent">Parent item</label>
            <select
              id="menu-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">Top level</option>
              {parentId && !items.some((entry) => entry.id === parentId) && (
                <option value={parentId}>
                  Unavailable parent — choose another
                </option>
              )}
              {items
                .filter(
                  (entry) =>
                    entry.id !== id && !isMenuDescendant(items, entry.id, id),
                )
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
            </select>
            <small className="muted">
              Nested items appear beneath their parent. Removing a parent also
              removes its menu children; linked pages are kept.
            </small>
          </div>
        </fieldset>
        {error && (
          <div className="navigation-form-error" role="alert">
            <p className="error">{error}</p>
            {conflict && (
              <>
                <p>
                  <strong>Saved label:</strong> {conflict.label}
                </p>
                <p>
                  <strong>Saved destination:</strong>{" "}
                  {conflict.destination.kind === "page"
                    ? "Garden page"
                    : conflict.destination.url}
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    expected.current = conflict;
                    setLabel(conflict.label);
                    setDestination(conflict.destination);
                    setParentId(conflict.parentId ?? "");
                    setConflict(null);
                    setError("");
                  }}
                >
                  Load saved values
                </button>
              </>
            )}
          </div>
        )}
        <div className="actions">
          <button disabled={busy}>
            {busy ? "Saving…" : item ? "Update menu item" : "Add menu item"}
          </button>
          <Link
            className="button secondary"
            href="/admin/navigation"
            aria-disabled={busy}
            onClick={(event) => {
              if (busy) event.preventDefault();
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
