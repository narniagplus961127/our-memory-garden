"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Trash2 } from "lucide-react";
import type { PhotoListItem } from "@/lib/media";
import { Button } from "./ui/button";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Toast } from "./toast";
import styles from "./media-selection.module.css";
import { Modal } from "./modal";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function useMediaSelection(
  photos: PhotoListItem[],
  onDeleted: (ids: string[]) => void,
  available: boolean,
  scope = "",
  loading = false,
) {
  const [review, setReview] = useState(false),
    [reviewSearch, setReviewSearch] = useState(""),
    [hiddenOnly, setHiddenOnly] = useState(false),
    [reviewLimit, setReviewLimit] = useState(100);
  const reviewTrigger = useRef<HTMLButtonElement>(null);
  const rangeAnchor = useRef<string | null>(null);
  useEffect(() => {
    rangeAnchor.current = null;
  }, [scope]);
  const enabled = available;
  const [selected, setSelected] = useState(new Map<string, PhotoListItem>()),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [failures, setFailures] = useState<
      { id: string; name: string; error: string }[]
    >([]),
    [progress, setProgress] = useState(0),
    [removed, setRemoved] = useState(0);
  const protectedCount = [...selected.values()].filter(
    (photo) => photo.usageCount > 0,
  ).length;
  const eligible = selected.size - protectedCount;
  const shownIds = new Set(photos.map((photo) => photo.id));
  const hiddenCount = [...selected.keys()].filter(
    (id) => !shownIds.has(id),
  ).length;
  const reviewed = [...selected.values()].filter(
    (photo) =>
      (!hiddenOnly || !shownIds.has(photo.id)) &&
      photo.name
        .toLocaleLowerCase()
        .includes(reviewSearch.trim().toLocaleLowerCase()),
  );
  function clearHidden() {
    setSelected(
      (current) => new Map([...current].filter(([id]) => shownIds.has(id))),
    );
  }
  function confirmDeletion() {
    setReview(false);
    setError("");
    setFailures([]);
    setRemoved(0);
    setConfirm(true);
  }
  useEffect(() => {
    setSelected((current) => {
      let changed = false;
      const next = new Map(current);
      for (const photo of photos) {
        const previous = next.get(photo.id);
        if (
          previous &&
          (previous.usageCount !== photo.usageCount ||
            previous.name !== photo.name ||
            previous.deletionPending !== photo.deletionPending)
        ) {
          next.set(photo.id, photo);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [photos]);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  function toggle(photo: PhotoListItem, extend = false) {
    if (busy || !available || !enabled) return;
    const anchor = photos.findIndex((item) => item.id === rangeAnchor.current);
    const end = photos.findIndex((item) => item.id === photo.id);
    if (extend && anchor >= 0 && end >= 0) {
      const range = photos.slice(
        Math.min(anchor, end),
        Math.max(anchor, end) + 1,
      );
      setSelected(
        (current) =>
          new Map([
            ...current,
            ...range.map((item) => [item.id, item] as const),
          ]),
      );
      return;
    }
    rangeAnchor.current = photo.id;
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(photo.id)) next.delete(photo.id);
      else next.set(photo.id, photo);
      return next;
    });
  }
  async function removeSelected() {
    const batch = [...selected.values()].filter(
      (photo) => photo.usageCount === 0,
    );
    if (!batch.length || busy) return;
    setBusy(true);
    setError("");
    setFailures([]);
    setProgress(0);
    let position = 0,
      finished = 0,
      stop = false;
    const deleted: string[] = [],
      errors: { id: string; name: string; error: string }[] = [];
    const worker = async () => {
      while (position < batch.length && !stop) {
        const photo = batch[position++];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 180000);
        try {
          const response = await fetch("/api/media/" + photo.id, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: true }),
            signal: controller.signal,
          });
          const result = await response.json().catch(() => null);
          if (!response.ok && response.status !== 404) {
            if (response.status === 401 || response.status === 403) stop = true;
            throw new Error(
              result?.error || "Could not delete this photo. Please retry.",
            );
          }
          deleted.push(photo.id);
          setSelected((current) => {
            const next = new Map(current);
            next.delete(photo.id);
            return next;
          });
        } catch (failure) {
          errors.push({
            id: photo.id,
            name: photo.name,
            error: controller.signal.aborted
              ? "Deletion took too long. Retry to check or finish deleting this photo."
              : failure instanceof TypeError
                ? "Connection interrupted. Retry to check or finish deleting this photo."
                : failure instanceof Error
                  ? failure.message
                  : "Could not delete this photo.",
          });
        } finally {
          clearTimeout(timer);
          finished++;
          setProgress(finished);
        }
      }
    };
    await Promise.all([worker(), worker()]);
    const totalRemoved = removed + deleted.length;
    setRemoved(totalRemoved);
    setBusy(false);
    onDeleted(deleted);
    if (errors.length) {
      setFailures(errors);
      setError(
        `${totalRemoved} ${totalRemoved === 1 ? "photo deleted" : "photos deleted"}. ${stop ? "Sign in again before deleting the remaining photos." : "Some photos could not be deleted. Review the reasons or retry the remaining selection."}`,
      );
    } else {
      setConfirm(false);
      setNotice(
        `${totalRemoved} ${totalRemoved === 1 ? "photo deleted" : "photos deleted"}.${protectedCount ? ` ${protectedCount} ${protectedCount === 1 ? "photo is" : "photos are"} in use and kept.` : ""}`,
      );
    }
  }
  return {
    toggle,
    isSelected: (id: string) => selected.has(id),
    busy,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!available || !enabled || busy || event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(
          (current) =>
            new Map([
              ...current,
              ...photos.map((photo) => [photo.id, photo] as const),
            ]),
        );
      }
    },
    forget: (id: string) =>
      setSelected((current) => {
        if (!current.has(id)) return current;
        const next = new Map(current);
        next.delete(id);
        return next;
      }),
    count: selected.size,
    enabled: available && enabled,
    checkbox: (photo: PhotoListItem) =>
      available && enabled ? (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            aria-label={"Select " + photo.name}
            checked={selected.has(photo.id)}
            disabled={busy}
            onClick={(event) => toggle(photo, event.shiftKey)}
            onChange={() => {}}
          />
        </label>
      ) : null,
    toolbar: available ? (
      <>
        {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
        {selected.size > 0 && (
          <div
            className={styles.toolbar}
            role="region"
            aria-label="Selected photos"
          >
            {enabled && (
              <>
                <span role="status">
                  {selected.size} selected
                  {protectedCount ? ` · ${protectedCount} in use` : ""}
                  {loading
                    ? " · Updating results…"
                    : hiddenCount
                      ? ` · ${hiddenCount} not shown`
                      : ""}
                </span>
                <Button
                  ref={reviewTrigger}
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setReviewSearch("");
                    setHiddenOnly(false);
                    setReviewLimit(100);
                    setReview(true);
                  }}
                >
                  Review selection
                </Button>
                <Button
                  variant="outline"
                  aria-label="Select loaded photos"
                  disabled={!photos.length || busy}
                  onClick={() =>
                    setSelected(
                      (current) =>
                        new Map([
                          ...current,
                          ...photos.map((photo) => [photo.id, photo] as const),
                        ]),
                    )
                  }
                >
                  Select loaded
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Clear selection"
                  disabled={!selected.size || busy}
                  onClick={() => {
                    setSelected(new Map());
                    rangeAnchor.current = null;
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  aria-label={
                    "Delete selected" + (eligible ? ` (${eligible})` : "")
                  }
                  disabled={!eligible || busy}
                  onClick={confirmDeletion}
                >
                  <Trash2 />
                  Delete{eligible ? ` (${eligible})` : ""}
                </Button>
              </>
            )}
            {protectedCount > 0 && (
              <p className={styles.help}>
                Photos in use are protected and kept.
              </p>
            )}
          </div>
        )}
        {enabled && (
          <p className={styles.help}>
            Click photos to select. Shift-click selects a range. Ctrl/⌘-click
            toggles a photo. Ctrl/⌘+A selects loaded photos while the photo grid
            is focused.
          </p>
        )}
      </>
    ) : null,
    dialog: (
      <>
        {review && (
          <Modal
            title="Review selected photos"
            description="Not shown photos are selected outside the currently loaded results. Removing a selection does not delete the photo."
            onClose={() => setReview(false)}
            returnFocus={reviewTrigger}
            footer={
              <>
                <Button variant="outline" onClick={() => setReview(false)}>
                  Close review
                </Button>
                <Button disabled={!eligible || busy} onClick={confirmDeletion}>
                  Continue to delete ({eligible})
                </Button>
              </>
            }
          >
            <div className="grid gap-4">
              <Label htmlFor="selected-photo-search">
                Find a selected photo
              </Label>
              <Input
                id="selected-photo-search"
                type="search"
                maxLength={200}
                value={reviewSearch}
                onChange={(event) => {
                  setReviewSearch(event.target.value);
                  setReviewLimit(100);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  aria-pressed={hiddenOnly}
                  disabled={loading}
                  onClick={() => {
                    setHiddenOnly((value) => !value);
                    setReviewLimit(100);
                  }}
                >
                  Not shown only
                </Button>
                <Button
                  variant="outline"
                  disabled={!hiddenCount || loading}
                  onClick={clearHidden}
                >
                  Remove hidden selections
                </Button>
              </div>
              <p role="status" className="m-0 muted">
                {selected.size} selected · {hiddenCount} not shown ·{" "}
                {protectedCount} in use
              </p>
              <ul className={styles.reviewList}>
                {reviewed.slice(0, reviewLimit).map((photo) => (
                  <li key={photo.id}>
                    <span>
                      <strong>{photo.name}</strong>
                      <small>
                        {shownIds.has(photo.id)
                          ? "Shown in current results"
                          : "Not shown in current results"}
                        {photo.usageCount ? " · In use — protected" : ""}
                      </small>
                    </span>
                    <Button
                      variant="outline"
                      aria-label={"Remove selection for " + photo.name}
                      onClick={() =>
                        setSelected((current) => {
                          const next = new Map(current);
                          next.delete(photo.id);
                          return next;
                        })
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
              {!reviewed.length && (
                <p className="m-0 muted">No selected photos match this view.</p>
              )}
              {reviewed.length > reviewLimit && (
                <div className="photo-pagination">
                  <Button
                    variant="outline"
                    onClick={() => setReviewLimit((value) => value + 100)}
                  >
                    Show more selected photos
                  </Button>
                </div>
              )}
            </div>
          </Modal>
        )}
        {confirm ? (
          <ConfirmationDialog
            title={`Delete ${eligible} ${eligible === 1 ? "photo" : "photos"} permanently?`}
            description="This removes the selected photos and their original and display copies from the shared library, including access from saved page versions. This cannot be undone. Photos used by current pages or covers will be kept."
            busy={busy}
            error={error}
            confirmLabel="Delete selected photos"
            retryLabel="Retry remaining photos"
            onConfirm={() => void removeSelected()}
            onCancel={() => setConfirm(false)}
            confirmDisabled={!eligible}
          >
            <p>
              {eligible} selected{" "}
              {eligible === 1 ? "photo will" : "photos will"} be permanently
              deleted.
            </p>
            {hiddenCount > 0 && (
              <p>
                {hiddenCount} selected{" "}
                {hiddenCount === 1 ? "photo is" : "photos are"} not shown in the
                current results. They are included in this selection.
              </p>
            )}
            {!busy && !failures.length && (
              <ul className={styles.failures}>
                {[...selected.values()]
                  .filter((photo) => !photo.usageCount)
                  .slice(0, 8)
                  .map((photo) => (
                    <li key={photo.id}>{photo.name}</li>
                  ))}
                {eligible > 8 && (
                  <li>And {eligible - 8} more selected photos.</li>
                )}
              </ul>
            )}
            {protectedCount > 0 && (
              <p>
                {protectedCount} selected{" "}
                {protectedCount === 1 ? "photo is" : "photos are"} currently in
                use and will be kept.
              </p>
            )}
            {busy && <p role="status">Deleting photos… {progress} finished</p>}
            {failures.length > 0 && (
              <ul className={styles.failures}>
                {failures.map((photo) => (
                  <li key={photo.id}>
                    <strong>{photo.name}</strong>
                    <span>{photo.error}</span>
                  </li>
                ))}
              </ul>
            )}
          </ConfirmationDialog>
        ) : null}
      </>
    ),
  };
}
