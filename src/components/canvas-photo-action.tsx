"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { registerOverlayPortal, useGetPuck } from "@puckeditor/core";
import { MediaLibrary } from "./media-library";
export function CanvasPhotoAction({
  id,
  hasPhoto,
}: {
  id: string;
  hasPhoto: boolean;
}) {
  const getPuck = useGetPuck(),
    ref = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.body);
    return registerOverlayPortal(ref.current, { disableDrag: true });
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  return (
    <div ref={ref} className="canvas-photo-action">
      <button
        ref={opener}
        type="button"
        className="secondary"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const api = getPuck(),
            selector = api.getSelectorForId(id);
          if (selector) {
            api.dispatch({ type: "setUi", ui: { itemSelector: selector } });
            setOpen(true);
          }
        }}
      >
        {hasPhoto ? "Replace photo" : "Choose photo"}
      </button>
      {open &&
        host &&
        createPortal(
          <dialog
            ref={dialog}
            className="canvas-photo-dialog"
            aria-label="Choose a photo"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onClose={() => {
              setOpen(false);
              const api = getPuck(),
                selector = api.getSelectorForId(id);
              if (selector)
                api.dispatch({ type: "setUi", ui: { itemSelector: selector } });
              opener.current?.focus();
            }}
            onCancel={() => setOpen(false)}
          >
            <div className="panel-heading">
              <h2>Choose a photo</h2>
              <button
                className="secondary"
                onClick={() => dialog.current?.close()}
              >
                Close photo library
              </button>
            </div>
            <MediaLibrary
              onSelect={(photoId) => {
                const api = getPuck(),
                  selector = api.getSelectorForId(id);
                const data = selector ? api.getItemById(id) : undefined;
                if (selector && data?.type === "Image")
                  api.dispatch({
                    type: "replace",
                    destinationIndex: selector.index,
                    destinationZone: selector.zone,
                    data: { ...data, props: { ...data.props, photoId } },
                  });
                dialog.current?.close();
              }}
            />
          </dialog>,
          host,
        )}
    </div>
  );
}
