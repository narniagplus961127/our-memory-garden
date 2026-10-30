"use client";
import { useId, useState } from "react";
import { MediaLibrary } from "./media-library";
import { displayPhotoUrl } from "@/lib/media";
import type { GalleryPhoto } from "./photo-gallery";
export function GallerySettings({
  value = [],
  onChange,
}: {
  value?: GalleryPhoto[];
  onChange: (value: GalleryPhoto[]) => void;
}) {
  const fieldId = useId();
  const [libraryOpen, setLibraryOpen] = useState(false);
  function move(index: number, delta: number) {
    const next = [...value];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }
  return (
    <div className="gallery-settings">
      <p className="field-label">Gallery photos · {value.length} of 100</p>
      <ol className="gallery-photo-list">
        {value.map((photo, index) => (
          <li key={index}>
            <img
              src={displayPhotoUrl(photo.photoId)}
              alt={`Photo ${index + 1}`}
            />
            <label htmlFor={`${fieldId}-${index}`}>
              Caption for photo {index + 1}
            </label>
            <textarea
              id={`${fieldId}-${index}`}
              maxLength={2000}
              value={photo.caption ?? ""}
              onChange={(event) =>
                onChange(
                  value.map((item, i) =>
                    i === index
                      ? { ...item, caption: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <div className="actions">
              <button
                type="button"
                className="secondary"
                aria-label={`Move photo ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="secondary"
                aria-label={`Move photo ${index + 1} down`}
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="secondary"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="secondary"
        disabled={value.length >= 100}
        onClick={() => setLibraryOpen(!libraryOpen)}
      >
        {libraryOpen ? "Close gallery library" : "Add gallery photo"}
      </button>
      {libraryOpen && (
        <MediaLibrary
          onSelect={(photoId) => {
            onChange([...value, { photoId, caption: "" }]);
            setLibraryOpen(false);
          }}
        />
      )}
    </div>
  );
}
