"use client";
import { useEffect, useState } from "react";
import { CheckSquare, Trash2 } from "lucide-react";
import type { PhotoListItem } from "@/lib/media";
import { Button } from "./ui/button";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Toast } from "./toast";
import styles from "./media-selection.module.css";

export function useMediaSelection(
  photos: PhotoListItem[],
  onDeleted: (ids: string[]) => void,
  available: boolean,
) {
  const [enabled, setEnabled] = useState(false),
    [selected, setSelected] = useState(new Map<string, PhotoListItem>()),
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
  function toggle(photo: PhotoListItem) {
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
            onChange={() => toggle(photo)}
          />
        </label>
      ) : null,
    toolbar: available ? (
      <>
        {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
        <div className={styles.toolbar}>
          <Button
            variant="outline"
            aria-pressed={enabled}
            onClick={() => {
              setEnabled(!enabled);
              setSelected(new Map());
            }}
            disabled={busy}
          >
            <CheckSquare />
            {enabled ? "Done selecting" : "Select photos"}
          </Button>
          {enabled && (
            <>
              <span role="status">
                {selected.size} selected
                {protectedCount ? ` · ${protectedCount} in use` : ""}
              </span>
              <Button
                variant="outline"
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
                Select loaded photos
              </Button>
              <Button
                variant="ghost"
                disabled={!selected.size || busy}
                onClick={() => setSelected(new Map())}
              >
                Clear selection
              </Button>
              <Button
                variant="outline"
                disabled={!eligible || busy}
                onClick={() => {
                  setError("");
                  setFailures([]);
                  setRemoved(0);
                  setConfirm(true);
                }}
              >
                <Trash2 />
                Delete selected{eligible ? ` (${eligible})` : ""}
              </Button>
            </>
          )}
        </div>
        {enabled && protectedCount > 0 && (
          <p className={styles.help}>
            Photos used by pages or covers are protected. Remove those
            references before deleting them.
          </p>
        )}
      </>
    ) : null,
    dialog: confirm ? (
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
          {eligible} selected {eligible === 1 ? "photo will" : "photos will"} be
          permanently deleted.
        </p>
        {!busy && !failures.length && (
          <ul className={styles.failures}>
            {[...selected.values()]
              .filter((photo) => !photo.usageCount)
              .slice(0, 8)
              .map((photo) => (
                <li key={photo.id}>{photo.name}</li>
              ))}
            {eligible > 8 && <li>And {eligible - 8} more selected photos.</li>}
          </ul>
        )}
        {protectedCount > 0 && (
          <p>
            {protectedCount} selected{" "}
            {protectedCount === 1 ? "photo is" : "photos are"} currently in use
            and will be kept.
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
    ) : null,
  };
}
