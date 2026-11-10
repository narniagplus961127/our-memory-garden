"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  AdminListGrip,
  AdminListRow,
  ListDragFeedback,
} from "./admin-list-row";
import { useListReorder } from "./use-list-reorder";
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
  const sort = useListReorder(
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
      <ol className="admin-list navigation-items">
        {siblings.map((item) => (
          <li
            key={item.id}
            data-menu-item={item.id}
            {...sort.rowProps(item.id)}
          >
            <AdminListRow
              className="navigation-item"
              title={item.label}
              href={"/admin/navigation/" + item.id + "/edit"}
              locked={locked}
              grip={<AdminListGrip {...sort.handleProps(item)} />}
              detail={
                item.destination.kind === "page"
                  ? "Garden page"
                  : item.destination.kind === "category"
                    ? "Category"
                    : item.destination.url
              }
              trailing={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={"Remove " + item.label}
                  title={"Remove " + item.label}
                  disabled={locked}
                  onClick={(event) => {
                    removalTrigger.current = event.currentTarget;
                    setRemovalError("");
                    setRemoval({ item, items, version });
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              }
            />
            {items.some((child) => child.parentId === item.id) && list(item.id)}
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
          <h1 ref={heading} tabIndex={-1}>
            Navigation
          </h1>
          <p className="muted">
            Arrange the paths through your garden. Private pages stay hidden
            from visitors.
          </p>
        </div>
        <Button asChild className="button">
          <Link
            href="/admin/navigation/new"
            aria-disabled={locked}
            tabIndex={locked ? -1 : undefined}
            onClick={(event) => {
              if (locked) event.preventDefault();
            }}
          >
            Add menu item
          </Link>
        </Button>
      </div>
      <div className="navigation-workspace">
        <section aria-label="Menu items">
          {items.length ? list(null) : <p>No menu items yet.</p>}
          <ListDragFeedback {...sort} />
          <p role="status" aria-label="Navigation status">
            {status}
          </p>
          {error && (
            <div role="alert">
              <p className="error">{error}</p>
              <Button onClick={() => void persist(items)}>
                Retry menu changes
              </Button>
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
    </>
  );
}
