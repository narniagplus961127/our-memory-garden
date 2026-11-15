"use client";

import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ZoomIn } from "lucide-react";
import { PhotoViewer } from "./photo-viewer";
import { SwiperPhotos } from "./swiper-viewport";
import { Button } from "./ui/button";

export function StandalonePhoto({
  photoId,
  alt,
  caption,
  href,
  children,
}: {
  photoId: string;
  alt: string;
  caption?: string;
  href?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const gallery = useContext(SwiperPhotos);
  useEffect(() => {
    const element = trigger.current;
    if (gallery && element)
      return gallery.register(element, { photoId, alt, caption });
  }, [gallery, photoId, alt, caption, href]);
  function openPhoto() {
    if (trigger.current && gallery?.open(trigger.current)) return;
    setOpen(true);
  }
  const label = "Zoom " + (alt || "photo");
  return (
    <div className="garden-photo-frame">
      {href ? (
        <>
          <a
            className="garden-image-link"
            href={href}
            aria-label={alt || "Open image link"}
          >
            {children}
          </a>
          <Button
            ref={trigger}
            type="button"
            variant="outline"
            size="icon"
            className="garden-photo-zoom-link"
            aria-label={label}
            title="Zoom photo"
            aria-haspopup="dialog"
            onClick={openPhoto}
          >
            <ZoomIn aria-hidden="true" />
          </Button>
        </>
      ) : (
        <button
          ref={trigger}
          type="button"
          className="garden-photo-zoom-trigger"
          aria-label={label}
          aria-haspopup="dialog"
          onClick={openPhoto}
        >
          {children}
        </button>
      )}
      {open && (
        <PhotoViewer
          photo={{ photoId, alt, caption }}
          trigger={trigger}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
