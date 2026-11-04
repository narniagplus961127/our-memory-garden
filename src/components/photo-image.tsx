"use client";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { ImageOff } from "lucide-react";
export function PhotoImage(
  props: Omit<ComponentProps<"img">, "src" | "ref"> & { src: string },
) {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // Server-rendered images can fail before hydration attaches onError.
    if (image.current?.complete && image.current.naturalWidth === 0)
      setFailedSource(props.src);
  }, [props.src]);
  if (failedSource && failedSource === props.src)
    return (
      <div
        className={"photo-unavailable " + (props.className ?? "")}
        role="img"
        aria-label={(props.alt || "Photo") + " — no longer available"}
      >
        <ImageOff aria-hidden="true" />
        <span>Photo no longer available</span>
      </div>
    );
  return (
    <img
      {...props}
      ref={image}
      onError={(event) => {
        setFailedSource(props.src);
        props.onError?.(event);
      }}
    />
  );
}
