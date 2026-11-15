"use client";

import { useRef, useState, type PointerEvent, type RefObject } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { displayPhotoUrl } from "@/lib/media";
import { Modal } from "./modal";
import { PhotoImage } from "./photo-image";
import { Button } from "./ui/button";

export type ViewerPhoto = {
  photoId: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};
type Point = { x: number; y: number };
type Frame = Point & { zoom: number };
const fitted: Frame = { x: 0, y: 0, zoom: 1 };
const maxZoom = 4;

function ZoomablePhoto({
  photo,
  alt,
  move,
}: {
  photo: ViewerPhoto;
  alt: string;
  move: (direction: -1 | 1) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const swipeStart = useRef<Point | null>(null);
  const imageSize = useRef<{ width: number; height: number }>(null);
  const [frame, setFrame] = useState(fitted);

  function constrain(zoom: number, x: number, y: number) {
    zoom = Math.max(1, Math.min(maxZoom, zoom));
    const width = stage.current?.clientWidth ?? 0;
    const height = stage.current?.clientHeight ?? 0;
    const imageWidth = photo.width ?? imageSize.current?.width ?? (width || 1);
    const imageHeight =
      photo.height ?? imageSize.current?.height ?? (height || 1);
    const fit = Math.min(width / imageWidth, height / imageHeight);
    const maxX = Math.max(0, (fit * imageWidth * zoom - width) / 2);
    const maxY = Math.max(0, (fit * imageHeight * zoom - height) / 2);
    return {
      zoom,
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }
  function changeZoom(delta: number) {
    setFrame((current) =>
      constrain(current.zoom + delta, current.x, current.y),
    );
  }
  function hold(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    swipeStart.current =
      event.pointerType !== "mouse" &&
      pointers.current.size === 1 &&
      frame.zoom === 1
        ? point
        : null;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function track(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    pointers.current.set(event.pointerId, next);
    const other = [...pointers.current].find(
      ([id]) => id !== event.pointerId,
    )?.[1];
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      if (before > 0)
        setFrame((current) =>
          constrain(
            (current.zoom * after) / before,
            current.x + dx / 2,
            current.y + dy / 2,
          ),
        );
    } else {
      setFrame((current) =>
        current.zoom === 1
          ? current
          : constrain(current.zoom, current.x + dx, current.y + dy),
      );
    }
  }
  function release(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = swipeStart.current;
    pointers.current.delete(event.pointerId);
    swipeStart.current = null;
    if (cancelled || !start || frame.zoom !== 1) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.2)
      move(dx < 0 ? 1 : -1);
  }

  return (
    <>
      <div
        ref={stage}
        className="photo-lightbox-pan"
        data-zoom={frame.zoom > 1}
        onPointerDown={hold}
        onPointerMove={track}
        onPointerUp={release}
        onPointerCancel={(event) => release(event, true)}
        onDoubleClick={() =>
          setFrame((current) =>
            current.zoom > 1 ? fitted : constrain(2, 0, 0),
          )
        }
      >
        <PhotoImage
          src={displayPhotoUrl(photo.photoId)}
          alt={alt}
          draggable={false}
          onLoad={(event) => {
            imageSize.current = {
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            };
          }}
          style={{
            transform: `translate(${frame.x}px, ${frame.y}px) scale(${frame.zoom})`,
          }}
        />
      </div>
      <div className="photo-lightbox-zoom" role="group" aria-label="Photo zoom">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Zoom out"
          disabled={frame.zoom <= 1}
          onClick={() => changeZoom(-0.5)}
        >
          <ZoomOut aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Reset zoom"
          className="photo-lightbox-zoom-value"
          disabled={frame.zoom <= 1}
          onClick={() => setFrame(fitted)}
        >
          {Math.round(frame.zoom * 100)}%
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Zoom in"
          disabled={frame.zoom >= maxZoom}
          onClick={() => changeZoom(0.5)}
        >
          <ZoomIn aria-hidden="true" />
        </Button>
      </div>
    </>
  );
}

export function PhotoViewer({
  photo,
  navigation,
  label,
  trigger,
  onClose,
}: {
  photo: ViewerPhoto;
  label?: string;
  navigation?: {
    index: number;
    total: number;
    canNext: boolean;
    loading?: boolean;
    error?: string;
    onMove: (direction: -1 | 1) => void;
  };
  trigger: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const alt =
    photo.alt ||
    photo.caption ||
    (navigation ? "Photo " + (navigation.index + 1) : "Photo");
  function move(direction: -1 | 1) {
    if (
      navigation &&
      ((direction === -1 && navigation.index > 0) ||
        (direction === 1 && navigation.canNext && !navigation.loading))
    )
      navigation.onMove(direction);
  }

  return (
    <Modal
      title={navigation ? "Photos" : "Photo"}
      label={label ?? (navigation ? "Photo grid viewer" : "Photo viewer")}
      closeLabel="Close photo viewer"
      onClose={onClose}
      returnFocus={trigger}
      className="photo-lightbox"
      onKeyDown={(event) => {
        if (
          navigation &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ) {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="photo-lightbox-stage">
        <ZoomablePhoto
          key={navigation?.index ?? photo.photoId}
          photo={photo}
          alt={alt}
          move={move}
        />
        {navigation && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="photo-lightbox-previous"
              aria-label="Previous photo"
              disabled={navigation.index === 0}
              onClick={() => move(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="photo-lightbox-next"
              aria-label="Next photo"
              disabled={!navigation.canNext || navigation.loading}
              onClick={() => move(1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
      {(navigation || photo.caption) && (
        <div className="photo-lightbox-caption">
          {photo.caption && <p>{photo.caption}</p>}
          {navigation && (
            <span aria-live="polite">
              {navigation.index + 1} of {navigation.total}
            </span>
          )}
          {navigation?.error && <p role="alert">{navigation.error}</p>}
        </div>
      )}
    </Modal>
  );
}
