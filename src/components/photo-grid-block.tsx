"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { displayPhotoUrl } from "@/lib/media";
import type { GridPhoto, GridPhotoBatch } from "@/lib/photo-grid";
import { Modal } from "./modal";
import { PhotoImage } from "./photo-image";
import { Button } from "./ui/button";

export async function fetchGridBatch(
  url: string,
  offset: number,
  signal?: AbortSignal,
) {
  const response = await fetch(url + "&offset=" + offset, { signal });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "Could not load photos. Try again.");
  return data as GridPhotoBatch;
}

export function PhotoGridBlock({
  initial,
  url,
  maxColumns = 4,
  gap = 12,
  radius = 10,
  editing = false,
}: {
  initial?: GridPhotoBatch;
  url?: string;
  maxColumns?: number;
  gap?: number;
  radius?: number;
  editing?: boolean;
}) {
  const [batch, setBatch] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const pending = useRef(false);
  const photos = batch?.photos ?? [];
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (initial || !url) return;
    const controller = new AbortController();
    setError("");
    setLoading(true);
    fetchGridBatch(url, 0, controller.signal)
      .then(setBatch)
      .catch((error: Error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [initial, url, retry]);
  async function loadMore(openNext = false) {
    if (!url || batch?.next == null || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    try {
      const next = await fetchGridBatch(url, batch.next);
      setBatch({ ...next, photos: [...photos, ...next.photos] });
      if (openNext && next.photos.length) setActive(photos.length);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }
  const columns = Math.min(
    maxColumns,
    width < 300 ? 1 : width < 640 ? 2 : width < 960 ? 3 : 4,
  );
  const heights = Array<number>(columns).fill(0);
  const columnWidth = (width - gap * (columns - 1)) / columns;
  const scale = Math.max(1, columnWidth);
  const placements = photos.map((photo) => {
    const column = heights.indexOf(Math.min(...heights));
    const top = heights[column];
    // Captions stay in the photo viewer so text wrapping does not move tiles.
    heights[column] += (scale * photo.height) / photo.width + gap;
    return { top, left: column * (columnWidth + gap), width: columnWidth };
  });
  const selected = active === null ? undefined : photos[active];
  function move(direction: number) {
    if (active === null) return;
    const next = active + direction;
    if (next >= 0 && next < photos.length) setActive(next);
    else if (next === photos.length) void loadMore(true);
  }
  return (
    <div className="garden-photo-grid">
      <div
        ref={list}
        className={width ? "photo-grid-measured" : "photo-grid-fallback"}
        aria-label="Photos"
        style={
          {
            height:
              width && photos.length ? Math.max(...heights) - gap : undefined,
            gap,
            "--tile-radius": radius + "px",
          } as CSSProperties
        }
      >
        {photos.map((photo, index) => {
          const alt = photo.alt || photo.caption || "Photo " + (index + 1);
          const image = (
            <PhotoImage
              src={displayPhotoUrl(photo.photoId)}
              alt={alt}
              width={photo.width}
              height={photo.height}
              loading={index < 4 ? "eager" : "lazy"}
            />
          );
          return (
            <div
              key={photo.entryId}
              className="photo-grid-tile"
              style={{
                ...(width ? placements[index] : undefined),
                aspectRatio: photo.width + " / " + photo.height,
              }}
            >
              {editing ? (
                image
              ) : (
                <button
                  type="button"
                  aria-label={"Open " + alt}
                  onClick={(event) => {
                    trigger.current = event.currentTarget;
                    setActive(index);
                  }}
                >
                  {image}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {editing && !photos.length && !loading && !error && (
        <div className="photo-grid-placeholder">
          Add photos in the Photo grid settings.
        </div>
      )}
      {error && (
        <p role="alert" className="photo-grid-feedback">
          {error}{" "}
          {!batch && (
            <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
              Retry
            </Button>
          )}
        </p>
      )}
      {batch?.next != null && (
        <div className="photo-grid-feedback">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading && active === null
              ? "Loading photos…"
              : "Load more photos"}
          </Button>
        </div>
      )}
      {selected && active !== null && (
        <Modal
          title={selected.caption || selected.alt || "Photos"}
          label="Photo grid viewer"
          closeLabel="Close photo viewer"
          onClose={() => setActive(null)}
          returnFocus={trigger}
          className="gallery-viewer modal-wide"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              move(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <figure className="gallery-enlarged">
            <PhotoImage
              src={displayPhotoUrl(selected.photoId)}
              alt={selected.alt || selected.caption || "Photo " + (active + 1)}
            />
          </figure>
          <div className="gallery-viewer-controls">
            <span aria-live="polite">
              {active + 1} of {batch?.total ?? photos.length}
            </span>
            <Button
              variant="outline"
              disabled={active === 0}
              onClick={() => move(-1)}
            >
              ← Previous
            </Button>
            <Button
              variant="outline"
              disabled={
                loading ||
                (active === photos.length - 1 && batch?.next === null)
              }
              onClick={() => move(1)}
            >
              Next →
            </Button>
          </div>
          {error && <p role="alert">{error}</p>}
        </Modal>
      )}
    </div>
  );
}
