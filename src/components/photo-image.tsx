"use client";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "./ui/button";
export function PhotoImage({
  embedded = false,
  errorHint = "Open the photo to try again.",
  ...props
}: Omit<ComponentProps<"img">, "src" | "ref"> & {
  src: string;
  embedded?: boolean;
  errorHint?: string;
}) {
  const [failure, setFailure] = useState<{
    src: string;
    url: string;
    kind: "checking" | "temporary" | "missing";
  }>();
  const [attempt, setAttempt] = useState(0);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // Server-rendered images can fail before hydration attaches onError.
    if (image.current?.complete && image.current.naturalWidth === 0)
      setFailure({
        src: props.src,
        url: image.current.currentSrc || props.src,
        kind: "checking",
      });
  }, [props.src]);
  useEffect(() => {
    if (!failure || failure.src !== props.src) return;
    const controller = new AbortController();
    const url = new URL(failure.url, window.location.origin);
    const check =
      url.origin === window.location.origin &&
      /^\/api\/media\/[\da-f-]{36}\/(?:display|original|thumb-(?:320|640|1280))$/.test(
        url.pathname,
      );
    const finish = (missing: boolean) => {
      if (!controller.signal.aborted)
        setFailure((current) =>
          current?.src === failure.src
            ? { ...current, kind: missing ? "missing" : "temporary" }
            : current,
        );
    };
    if (check)
      void fetch(url, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
      })
        .then((response) =>
          finish(response.status === 404 || response.status === 410),
        )
        .catch(() => finish(false));
    else finish(false);
    return () => controller.abort();
  }, [failure?.src, failure?.url, props.src]);
  const failed = failure?.src === props.src ? failure : undefined;
  if (failed)
    return (
      <div
        className={"photo-unavailable " + (props.className ?? "")}
        role={embedded ? "img" : "group"}
        aria-label={
          (props.alt || "Photo") +
          " — " +
          (failed.kind === "missing" ? "unavailable" : "could not load")
        }
      >
        <ImageOff aria-hidden="true" />
        <span>
          {failed.kind === "missing"
            ? "Photo unavailable"
            : "Couldn’t load this photo"}
        </span>
        {!embedded && (
          <span className="text-xs">
            {failed.kind === "missing"
              ? "It may have been removed or access has changed."
              : "Check your connection and try again."}
          </span>
        )}
        {embedded ? (
          <span className="text-xs">{errorHint}</span>
        ) : (
          <Button
            type="button"
            variant="outline"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setAttempt((current) => current + 1);
              setFailure(undefined);
            }}
          >
            Retry photo
          </Button>
        )}
      </div>
    );
  const retrySource = (source: string) =>
    attempt && source.startsWith("/api/media/")
      ? source + (source.includes("?") ? "&" : "?") + "retry=" + attempt
      : source;
  return (
    <img
      {...props}
      key={attempt}
      src={retrySource(props.src)}
      srcSet={props.srcSet
        ?.split(",")
        .map((candidate) => {
          const [source, ...size] = candidate.trim().split(/\s+/);
          return [retrySource(source), ...size].join(" ");
        })
        .join(", ")}
      ref={image}
      onError={(event) => {
        setFailure({
          src: props.src,
          url: event.currentTarget.currentSrc || props.src,
          kind: "checking",
        });
        props.onError?.(event);
      }}
    />
  );
}
