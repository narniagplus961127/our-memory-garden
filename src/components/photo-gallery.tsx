"use client";
import { useRef, useState } from "react";
import { displayPhotoUrl } from "@/lib/media";
import { Modal } from "./modal";
import { Button } from "./ui/button";
import { PhotoImage } from "./photo-image";
export type GalleryPhoto = { photoId: string; caption?: string };
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
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
            <Button
              type="button"
              className="gallery-thumbnail"
              aria-label={`Open photo ${i + 1}${item.caption ? ": " + item.caption : ""}`}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setIndex(i);
              }}
            >
              <PhotoImage
                src={displayPhotoUrl(item.photoId)}
                alt={item.caption || `Gallery photo ${i + 1}`}
                loading="lazy"
              />
            </Button>
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </figure>
        ))}
      </div>
      {photo && (
        <Modal
          closeLabel="Close photo viewer"
          title="Photos"
          label="Gallery photo viewer"
          onClose={() => setIndex(null)}
          returnFocus={trigger}
          className="gallery-viewer modal-wide"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              move(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <p className="muted" aria-live="polite">
            {(index ?? 0) + 1} of {photos.length}
          </p>
          <figure className="gallery-enlarged">
            <PhotoImage
              src={displayPhotoUrl(photo.photoId)}
              alt={photo.caption || `Gallery photo ${(index ?? 0) + 1}`}
            />
            {photo.caption && (
              <figcaption aria-live="polite">{photo.caption}</figcaption>
            )}
          </figure>
          <div className="gallery-viewer-controls">
            <Button
              type="button"
              variant="outline"
              aria-label="Previous photo"
              disabled={photos.length < 2}
              onClick={() => move(-1)}
            >
              ← Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Next photo"
              disabled={photos.length < 2}
              onClick={() => move(1)}
            >
              Next →
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
