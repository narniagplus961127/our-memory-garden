"use client";
import { useEffect, useRef, useState } from "react";
import { registerOverlayPortal, useGetPuck } from "@puckeditor/core";
import { PhotoLibraryDialog } from "./media-library";
import { Button } from "./ui/button";
export function CanvasPhotoAction({
  id,
  hasPhoto,
}: {
  id: string;
  hasPhoto: boolean;
}) {
  const getPuck = useGetPuck(),
    ref = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(
    () => registerOverlayPortal(ref.current, { disableDrag: true }),
    [],
  );
  function close() {
    setOpen(false);
    const api = getPuck(),
      selector = api.getSelectorForId(id);
    if (selector)
      api.dispatch({ type: "setUi", ui: { itemSelector: selector } });
  }
  return (
    <div ref={ref} className="canvas-photo-action">
      <Button
        ref={opener}
        aria-haspopup="dialog"
        type="button"
        variant="outline"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const api = getPuck(),
            selector = api.getSelectorForId(id);
          if (selector) {
            api.dispatch({ type: "setUi", ui: { itemSelector: selector } });
            setOpen(true);
          }
        }}
      >
        {hasPhoto ? "Replace photo" : "Choose photo"}
      </Button>
      {open && (
        <PhotoLibraryDialog
          onClose={close}
          returnFocus={opener}
          onSelect={(photoId) => {
            const api = getPuck(),
              selector = api.getSelectorForId(id),
              data = selector ? api.getItemById(id) : undefined;
            if (selector && data?.type === "Image")
              api.dispatch({
                type: "replace",
                destinationIndex: selector.index,
                destinationZone: selector.zone,
                data: { ...data, props: { ...data.props, photoId } },
              });
            close();
          }}
        />
      )}
    </div>
  );
}
