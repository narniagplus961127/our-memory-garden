"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
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
import { displayPhotoUrl } from "@/lib/media";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { MediaLibrary } from "./media-library";
import { Modal } from "./modal";
import { PhotoControls } from "./editor-photo-controls";
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
  const editOpener = useRef<HTMLButtonElement>(null);
  const moving = useRef<string | null>(null);
  const pending = useRef(false);
  const field = useId();
  const url = gridPhotosUrl(pageId, blockId, reference);
  const photos = batch?.photos ?? [];
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
  function move(entryId: string, before: string | null) {
    if (entryId !== before) void submit({ action: "move", entryId, before });
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
    <div className="grid gap-3">
      {batch && (
        <small className="muted">
          {batch.total} {batch.total === 1 ? "photo" : "photos"}
        </small>
      )}
      <Button
        ref={opener}
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
      <ol className="grid gap-2 p-0 m-0 list-none" aria-label="Grid photos">
        {photos.map((photo, index) => {
          const name = photo.name ?? "Photo " + (index + 1);
          return (
            <li
              key={photo.entryId}
              className="photo-grid-editor-item"
              onDragOver={(event) => {
                if (moving.current && !busy && !loading) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const entry = moving.current;
                moving.current = null;
                if (!entry || entry === photo.entryId) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const after = event.clientY >= bounds.top + bounds.height / 2;
                if (after && index === photos.length - 1 && batch?.next != null)
                  return;
                move(
                  entry,
                  after ? (photos[index + 1]?.entryId ?? null) : photo.entryId,
                );
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  className="photo-grid-grip"
                  draggable={!busy && !loading}
                  aria-label={"Drag " + name}
                  onDragStart={(event) => {
                    moving.current = photo.entryId;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", photo.entryId);
                  }}
                  onDragEnd={() => {
                    moving.current = null;
                  }}
                >
                  <GripVertical size={16} aria-hidden="true" />
                </button>
                <img
                  src={displayPhotoUrl(photo.photoId)}
                  alt=""
                  width={40}
                  height={40}
                />
                <span className="min-w-0 truncate">{name}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={busy || loading || index === 0}
                  aria-label={"Move " + name + " up"}
                  onClick={() => move(photo.entryId, photos[index - 1].entryId)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={
                    busy ||
                    loading ||
                    index === photos.length - 1 ||
                    (index === photos.length - 2 && batch?.next != null)
                  }
                  aria-label={"Move " + name + " down"}
                  onClick={() =>
                    move(photo.entryId, photos[index + 2]?.entryId ?? null)
                  }
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={busy || loading}
                  aria-label={"Edit " + name}
                  onClick={(event) => {
                    editOpener.current = event.currentTarget;
                    setError("");
                    setFailed(null);
                    setEditing(photo);
                  }}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={busy || loading}
                  aria-label={"Remove " + name + " from grid"}
                  onClick={() =>
                    void submit({ action: "remove", entryId: photo.entryId })
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {batch?.next != null && (
        <Button
          type="button"
          variant="outline"
          disabled={busy || loading}
          onClick={() => void loadMore()}
        >
          Show more photos
        </Button>
      )}
      {library && (
        <Modal
          title="Choose photos"
          onClose={() => {
            setLibrary(false);
            setError("");
            setFailed(null);
          }}
          busy={busy}
          returnFocus={opener}
          className="modal-wide photo-grid-picker"
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
          <MediaLibrary
            multiple={{
              selected,
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
          />
          {selected.size === photoGridAddLimit && (
            <p>Save this batch to select more photos.</p>
          )}
        </Modal>
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
            <Label htmlFor={field + "-alt"}>Alt text</Label>
            <Input
              id={field + "-alt"}
              value={editing.alt}
              maxLength={1000}
              disabled={busy}
              onChange={(event) =>
                setEditing({ ...editing, alt: event.target.value })
              }
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
