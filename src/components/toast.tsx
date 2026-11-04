"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
export function Toast({
  message,
  tone = "info",
  actionLabel,
  onAction,
  onDismiss,
}: {
  message: string;
  tone?: "info" | "error";
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (tone === "error" || paused || !dismiss.current) return;
    const timer = setTimeout(() => dismiss.current?.(), 6000);
    return () => clearTimeout(timer);
  }, [message, paused, tone]);
  return (
    <div
      className={"garden-toast garden-toast-" + tone}
      role={tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused(false);
      }}
    >
      <p>{message}</p>
      {onAction && (
        <Button type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {onDismiss && (
        <Button
          type="button"
          className="secondary toast-dismiss"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          ×
        </Button>
      )}
    </div>
  );
}
