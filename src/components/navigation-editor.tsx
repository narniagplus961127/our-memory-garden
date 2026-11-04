"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useMenuReorder } from "./use-menu-reorder";
import type { MenuItem } from "@/lib/destinations";
import { isMenuDescendant, type NavigationState } from "@/lib/navigation";
import { fetchNavigation, putNavigation } from "@/lib/navigation-client";
export function NavigationEditor({ initial }: { initial: NavigationState }) {
  const [items, setItems] = useState(initial.items),
    [version, setVersion] = useState(initial.version),
    [status, setStatus] = useState("Saved"),
    [error, setError] = useState(""),
    [removal, setRemoval] = useState<{
      item: MenuItem;
      items: MenuItem[];
      version: number;
    } | null>(null),
    [removing, setRemoving] = useState(false),
    [removalError, setRemovalError] = useState("");
  const inFlight = useRef(false),
    heading = useRef<HTMLHeadingElement>(null),
    removalTrigger = useRef<HTMLButtonElement | null>(null);
  const busy = status === "Saving…" || removing;
  const locked = busy || status === "Not saved" || Boolean(removal);
  const sort = useMenuReorder(
    items,
    busy || Boolean(removal),
    (next) => void persist(next),
  );
  async function persist(next: MenuItem[]) {
    setItems(next);
    setStatus("Saving…");
    setError("");
    try {
      const data = await putNavigation(next, version);
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
  async function removeConfirmed() {
    if (!removal || inFlight.current) return;
    inFlight.current = true;
    setRemoving(true);
    setRemovalError("");
    try {
      const next = removal.items.filter(
        (item) =>
          item.id !== removal.item.id &&
          !isMenuDescendant(removal.items, item.id, removal.item.id),
      );
      const saved = await putNavigation(next, removal.version);
      setItems(saved.items);
      setVersion(saved.version);
      setStatus("Saved");
      setRemoval(null);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (failure) {
      setRemovalError(
        failure instanceof Error
          ? failure.message
          : "Could not remove the menu item. Try again.",
      );
    } finally {
      inFlight.current = false;
      setRemoving(false);
    }
  }
  async function reviewSavedMenu() {
    if (inFlight.current) return;
    inFlight.current = true;
    setRemoving(true);
    try {
      const saved = await fetchNavigation();
      setItems(saved.items);
      setVersion(saved.version);
      setStatus("Saved");
      setError("");
      closeRemoval();
      setRemovalError("");
    } catch (failure) {
      setRemovalError(
        failure instanceof Error
          ? failure.message
          : "Could not reload the saved menu.",
      );
    } finally {
      inFlight.current = false;
      setRemoving(false);
    }
  }
  function closeRemoval() {
    setRemoval(null);
    requestAnimationFrame(() => {
      if (removalTrigger.current?.isConnected) removalTrigger.current.focus();
      else heading.current?.focus();
    });
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
                <p
                  className="muted"
                  title={
                    item.destination.kind === "page"
                      ? "Garden page"
                      : item.destination.url
                  }
                >
                  <small>
                    {item.destination.kind === "page"
                      ? "Garden page"
                      : item.destination.url}
                  </small>
                </p>
              </div>
              <div className="navigation-item-actions">
                <Link
                  href={"/admin/navigation/" + item.id + "/edit"}
                  className="button secondary"
                  aria-label={"Edit " + item.label}
                  title={"Edit " + item.label}
                  aria-disabled={locked}
                  tabIndex={locked ? -1 : undefined}
                  onClick={(event) => {
                    if (locked) event.preventDefault();
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m16 3 5 5-13 13-5 1 1-5ZM14 5l5 5" />
                  </svg>
                </Link>
                <button
                  type="button"
                  className="secondary"
                  aria-label={"Remove " + item.label}
                  title={"Remove " + item.label}
                  disabled={locked}
                  onClick={(event) => {
                    removalTrigger.current = event.currentTarget;
                    setRemovalError("");
                    setRemoval({ item, items, version });
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                  </svg>
                </button>
              </div>
            </div>
            {list(item.id)}
          </li>
        ))}
      </ol>
    );
  }
  const nestedRemovalCount = removal
    ? removal.items.filter((entry) =>
        isMenuDescendant(removal.items, entry.id, removal.item.id),
      ).length
    : 0;
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
        <Link
          href="/admin/navigation/new"
          className="button"
          aria-disabled={locked}
          tabIndex={locked ? -1 : undefined}
          onClick={(event) => {
            if (locked) event.preventDefault();
          }}
        >
          Add menu item
        </Link>
      </div>
      <div className="navigation-workspace">
        <section aria-label="Menu items">
          <h2 ref={heading} tabIndex={-1}>
            Your menu
          </h2>
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
      </div>
      {removal && (
        <ConfirmationDialog
          title="Remove menu item?"
          description={`Remove “${removal.item.label}” from your website menu?`}
          busy={removing}
          error={removalError}
          confirmLabel="Remove menu item"
          retryLabel="Try removing again"
          reloadLabel="Review saved menu"
          onConfirm={() => void removeConfirmed()}
          onCancel={closeRemoval}
          onReload={() => void reviewSavedMenu()}
        >
          {nestedRemovalCount > 0 && (
            <p>
              {nestedRemovalCount} nested menu{" "}
              {nestedRemovalCount === 1 ? "item" : "items"} will also be
              removed.
            </p>
          )}
          <p>Your pages and their content will be kept.</p>
        </ConfirmationDialog>
      )}
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
