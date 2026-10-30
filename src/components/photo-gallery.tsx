"use client";
import { useEffect, useRef, useState } from "react";
import { displayPhotoUrl } from "@/lib/media";
export type GalleryPhoto = { photoId: string; caption?: string };
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const open = index !== null;
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const body = dialog.ownerDocument.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);
  const photo = index === null ? undefined : photos[index];
  function move(delta: number) {
    setIndex((current) =>
      current === null
        ? null
        : (current + delta + photos.length) % photos.length,
    );
  }
  return (
    <div className="garden-gallery garden-block">
      {!photos.length && (
        <p className="muted">Add photographs from the shared library.</p>
      )}
      <div className="gallery-grid">
        {photos.map((item, i) => (
          <figure key={i}>
            <button
              type="button"
              className="gallery-thumbnail"
              aria-label={`Open photo ${i + 1}${item.caption ? ": " + item.caption : ""}`}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setIndex(i);
              }}
            >
              <img
                src={displayPhotoUrl(item.photoId)}
                alt={item.caption || `Gallery photo ${i + 1}`}
                loading="lazy"
              />
            </button>
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </figure>
        ))}
      </div>
      {photo && (
        <dialog
          ref={dialogRef}
          className="gallery-viewer"
          aria-label="Gallery photo viewer"
          onCancel={(event) => {
            event.preventDefault();
            setIndex(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              move(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <div className="gallery-viewer-top">
            <span aria-live="polite">
              {(index ?? 0) + 1} of {photos.length}
            </span>
            <button
              type="button"
              className="secondary"
              autoFocus
              aria-label="Close photo viewer"
              onClick={() => setIndex(null)}
            >
              Close ×
            </button>
          </div>
          <figure className="gallery-enlarged">
            <img
              src={displayPhotoUrl(photo.photoId)}
              alt={photo.caption || `Gallery photo ${(index ?? 0) + 1}`}
            />
            {photo.caption && (
              <figcaption aria-live="polite">{photo.caption}</figcaption>
            )}
          </figure>
          <div className="gallery-viewer-controls">
            <button
              type="button"
              className="secondary"
              aria-label="Previous photo"
              disabled={photos.length < 2}
              onClick={() => move(-1)}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="secondary"
              aria-label="Next photo"
              disabled={photos.length < 2}
              onClick={() => move(1)}
            >
              Next →
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
