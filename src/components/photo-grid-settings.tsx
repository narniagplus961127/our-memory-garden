"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { createUsePuck } from "@puckeditor/core";
import {
  gridPhotosUrl,
  photoGridAddLimit,
  photoGridBatchSize,
  type GridPhoto,
  type GridPhotoBatch,
  type PhotoGridChange,
  type PhotoGridRef,
} from "@/lib/photo-grid";
import type { GardenPage } from "@/lib/pages";
import { thumbnailPhotoUrl } from "@/lib/media";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { PhotoLibraryDialog } from "./media-library";
import { useListReorder } from "./use-list-reorder";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Modal } from "./modal";
import { PhotoControls } from "./editor-photo-controls";
import { PhotoDescriptionInput } from "./photo-description-input";
import { photoDescription } from "@/lib/photo-description";
import { fetchGridBatch, PhotoGridBlock } from "./photo-grid-block";
import type { gardenConfig, GardenBlocks } from "./garden-blocks";

const useGridPuck = createUsePuck<typeof gardenConfig>();

export const PhotoGridEditor = createContext<{
  pageId: string;
  saved: (page: GardenPage) => void;
} | null>(null);

export function GridCanvas({
  id,
  editing,
  gridId,
  gridRevision,
  initialPhotos,
  photosUrl,
  maxColumns,
  photoGap,
  photoRadius,
  photoAnimation,
}: GardenBlocks["PhotoGrid"] & {
  id: string;
  editing: boolean;
}) {
  const editor = useContext(PhotoGridEditor);
  const url =
    editing && editor && gridId && gridRevision
      ? gridPhotosUrl(editor.pageId, id, { gridId, gridRevision })
      : photosUrl;
  return (
    <PhotoGridBlock
      key={url ?? id}
      initial={initialPhotos}
      url={url}
      editing={editing}
      maxColumns={maxColumns}
      gap={photoGap}
      radius={photoRadius}
      photoAnimation={photoAnimation}
    />
  );
}

export function PhotoGridSettings() {
  const editor = useContext(PhotoGridEditor);
  const block = useGridPuck((state) => state.selectedItem);
  if (block?.type !== "PhotoGrid") return null;
  const { id, gridId, gridRevision } = block.props;
  return (
    <PhotoControls field>
      {editor && gridId && gridRevision ? (
        <GridPhotoList
          key={gridId}
          pageId={editor.pageId}
          blockId={id}
          reference={{ gridId, gridRevision }}
          saved={editor.saved}
        />
      ) : (
        <p className="muted">The grid must be saved before adding photos.</p>
      )}
    </PhotoControls>
  );
}

type PendingChange = { change: PhotoGridChange; requestId: string };
function GridPhotoList({
  pageId,
  blockId,
  reference,
  saved,
}: {
  pageId: string;
  blockId: string;
  reference: PhotoGridRef;
  saved: (page: GardenPage) => void;
}) {
  const [batch, setBatch] = useState<GridPhotoBatch>();
  const [loading, setLoading] = useState(true);
  const loadedCount = useRef(photoGridBatchSize);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<PendingChange | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [library, setLibrary] = useState(false);
  const [selected, setSelected] = useState(new Set<string>());
  const [editing, setEditing] = useState<GridPhoto | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const editOpener = useRef<HTMLElement>(null);
  const pending = useRef(false);
  const field = useId();
  const url = gridPhotosUrl(pageId, blockId, reference);
  const photos = batch?.photos;
  const undescribed =
    photos?.filter((photo) => !photoDescription(photo.alt, photo.caption))
      .length ?? 0;
  const items = useMemo(
    () =>
      (photos ?? []).map((photo, index) => ({
        id: photo.entryId,
        label: photo.name ?? "Photo " + (index + 1),
      })),
    [photos],
  );
  const sorter = useListReorder(
    items,
    busy || loading,
    (next, id) => {
      const index = next.findIndex((item) => item.id === id);
      void move(id, next[index + 1]?.id ?? null);
    },
    undefined,
    "grid",
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    async function readLoadedPhotos() {
      const nextBatch = await fetchGridBatch(url, 0, controller.signal);
      while (
        nextBatch.next !== null &&
        nextBatch.photos.length < loadedCount.current
      ) {
        const next = await fetchGridBatch(
          url,
          nextBatch.next,
          controller.signal,
        );
        nextBatch.photos.push(...next.photos);
        nextBatch.next = next.next;
      }
      if (!controller.signal.aborted) setBatch(nextBatch);
    }
    readLoadedPhotos()
      .catch((error: Error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, reload]);

  async function submit(
    change: PhotoGridChange,
    requestId = crypto.randomUUID(),
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setFailed(null);
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...change, ...reference, requestId }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          const latest = await fetch("/api/pages/" + pageId, {
            cache: "no-store",
          });
          if (latest.ok) saved(await latest.json());
        }
        throw Error(result.error ?? "Could not save the photos. Try again.");
      }
      saved(result.page);
      if (change.action === "add") {
        setLibrary(false);
        setSelected(new Set());
      }
      if (change.action === "edit") setEditing(null);
    } catch (error) {
      setError((error as Error).message);
      setFailed({ change, requestId });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function loadMore() {
    if (batch?.next == null || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    setFailed(null);
    try {
      const next = await fetchGridBatch(url, batch.next);
      const photos = [...batch.photos, ...next.photos];
      loadedCount.current = photos.length;
      setBatch({ ...next, photos });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }
  async function move(entryId: string, before: string | null) {
    if (entryId === before || pending.current) return;
    if (before === null && batch?.next != null) {
      // Keep a move to the last visible position ahead of unloaded photos.
      pending.current = true;
      setBusy(true);
      setError("");
      setFailed(null);
      try {
        before =
          (await fetchGridBatch(url, batch.next)).photos[0]?.entryId ?? null;
      } catch (error) {
        setError((error as Error).message);
        return;
      } finally {
        pending.current = false;
        setBusy(false);
      }
    }
    await submit({ action: "move", entryId, before });
  }
  const failure = error && (
    <div role="alert" className="grid gap-2">
      <p className="m-0">{error}</p>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() =>
          failed
            ? void submit(failed.change, failed.requestId)
            : setReload((n) => n + 1)
        }
      >
        Retry
      </Button>
    </div>
  );
  return (
    <div className="photo-grid-manager grid gap-3">
      {batch && (
        <small className="muted">
          {batch.total} {batch.total === 1 ? "photo" : "photos"}
        </small>
      )}
      <Button
        ref={opener}
        aria-haspopup="dialog"
        type="button"
        disabled={busy || loading}
        onClick={() => {
          setSelected(new Set());
          setError("");
          setFailed(null);
          setLibrary(true);
        }}
      >
        + Add photos
      </Button>
      {busy && (
        <p role="status" className="m-0 muted">
          Saving photos…
        </p>
      )}
      {loading && !batch && (
        <p role="status" className="m-0 muted">
          Loading photos…
        </p>
      )}
      {!library && !editing && failure}
      {undescribed > 0 && (
        <p className="muted text-xs m-0">
          {undescribed} of the loaded photos still need descriptions. Use a
          photo’s menu → Edit details to add alt text or a short caption.
        </p>
      )}
      <span id={sorter.instructionsId} className="sr-only">
        Drag a photo to reorder it. With a keyboard, press Space, use the arrow
        keys, then press Enter to drop.
      </span>
      <span className="sr-only" role="status">
        {sorter.announcement}
      </span>
      <ol className="photo-grid-editor-list" aria-label="Grid photos">
        {photos?.map((photo, index) => {
          const item = items[index];
          const actionId = field + "-" + photo.entryId;
          return (
            <li
              key={item.id}
              {...sorter.rowProps(item.id)}
              className="photo-grid-editor-item"
            >
              <button
                type="button"
                className="photo-grid-grip admin-list-drag-handle"
                disabled={busy || loading}
                title={item.label}
                {...sorter.handleProps(item)}
              >
                <img
                  src={thumbnailPhotoUrl(photo.photoId)}
                  alt=""
                  loading="lazy"
                  width={96}
                  height={96}
                  draggable={false}
                />
              </button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    id={actionId}
                    className="photo-grid-item-actions"
                    aria-label={"Actions for " + item.label}
                    disabled={busy || loading}
                  >
                    <Ellipsis aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      editOpener.current = document.getElementById(actionId);
                      setError("");
                      setFailed(null);
                      setEditing(photo);
                    }}
                  >
                    <Pencil aria-hidden="true" /> Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      void submit({ action: "remove", entryId: photo.entryId })
                    }
                  >
                    <Trash2 aria-hidden="true" /> Remove from grid
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ol>
      {batch?.next != null && (
        <div className="photo-pagination">
          <Button
            type="button"
            variant="outline"
            disabled={busy || loading}
            onClick={() => void loadMore()}
          >
            Show more photos
          </Button>
        </div>
      )}
      {library && (
        <PhotoLibraryDialog
          title="Choose photos"
          onClose={() => {
            setLibrary(false);
            setError("");
            setFailed(null);
          }}
          busy={busy}
          returnFocus={opener}
          multiple={{
            selected,
            add: (ids) => {
              if (busy) return;
              setSelected((current) => {
                const next = new Set(current);
                for (const id of ids) {
                  if (next.size >= photoGridAddLimit) break;
                  next.add(id);
                }
                return next;
              });
            },
            toggle: (id) => {
              if (busy) return;
              setSelected((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else if (next.size < photoGridAddLimit) next.add(id);
                return next;
              });
            },
          }}
          footer={
            <>
              <span className="photo-grid-selection-count" role="status">
                {selected.size} selected
              </span>
              <Button
                type="button"
                disabled={!selected.size || busy}
                onClick={() =>
                  void submit({
                    action: "add",
                    photos: [...selected].map((photoId) => ({
                      photoId,
                      entryId: crypto.randomUUID(),
                    })),
                  })
                }
              >
                {busy
                  ? "Adding photos…"
                  : "Add " +
                    selected.size +
                    (selected.size === 1 ? " photo" : " photos")}
              </Button>
            </>
          }
        >
          {failure}
          {selected.size === photoGridAddLimit && (
            <p>
              You can add up to {photoGridAddLimit.toLocaleString("en-US")}{" "}
              photos at a time.
            </p>
          )}
        </PhotoLibraryDialog>
      )}
      {editing && (
        <Modal
          title="Edit photo details"
          onClose={() => {
            setEditing(null);
            setError("");
            setFailed(null);
          }}
          busy={busy}
          returnFocus={editOpener}
          footer={
            <Button type="submit" form={field} disabled={busy}>
              {busy ? "Saving…" : "Save photo details"}
            </Button>
          }
        >
          {failure}
          <form
            id={field}
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit({
                action: "edit",
                entryId: editing.entryId,
                alt: editing.alt,
                caption: editing.caption,
              });
            }}
          >
            <PhotoDescriptionInput
              label="Alt text"
              value={editing.alt}
              disabled={busy}
              onChange={(alt) => setEditing({ ...editing, alt })}
            />
            <Label htmlFor={field + "-caption"}>Caption</Label>
            <Textarea
              id={field + "-caption"}
              value={editing.caption}
              maxLength={2000}
              disabled={busy}
              onChange={(event) =>
                setEditing({ ...editing, caption: event.target.value })
              }
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
