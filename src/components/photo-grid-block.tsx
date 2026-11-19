"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { responsivePhotoSources } from "@/lib/media";
import type { GridPhoto, GridPhotoBatch } from "@/lib/photo-grid";
import { PhotoViewer } from "./photo-viewer";
import { PhotoImage } from "./photo-image";
import { AnimatedBlock } from "./animated-block";
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
  photoAnimation = "fade-in",
  editing = false,
}: {
  initial?: GridPhotoBatch;
  url?: string;
  maxColumns?: number;
  gap?: number;
  radius?: number;
  photoAnimation?: React.ComponentProps<typeof AnimatedBlock>["animation"];
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
      if (openNext && next.photos.length)
        setActive((open) =>
          open === photos.length - 1 ? photos.length : open,
        );
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
              {...responsivePhotoSources(
                photo.photoId,
                width
                  ? Math.ceil(scale) + "px"
                  : "(max-width: 300px) 100vw, (max-width: 640px) 50vw, 320px",
                photo.width,
              )}
              alt={alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
            />
          );
          return (
            <AnimatedBlock
              key={photo.entryId}
              animation={photoAnimation}
              editing={editing}
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
            </AnimatedBlock>
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
        <div className="photo-pagination">
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
        <PhotoViewer
          photo={selected}
          navigation={{
            index: active,
            total: batch?.total ?? photos.length,
            canNext: active < photos.length - 1 || batch?.next != null,
            loading,
            error,
            onMove: move,
          }}
          trigger={trigger}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
