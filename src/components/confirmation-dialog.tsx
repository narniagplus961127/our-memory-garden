"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function ConfirmationDialog({
  title,
  description,
  children,
  busy,
  error,
  confirmLabel,
  retryLabel,
  reloadLabel,
  onConfirm,
  onCancel,
  onReload,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  busy: boolean;
  error: string;
  confirmLabel: string;
  retryLabel: string;
  reloadLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  onReload: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    id = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    cancel.current?.focus();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirmation-dialog"
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-description"}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <header>
        <h2 id={id + "-title"}>{title}</h2>
      </header>
      <div className="confirmation-dialog-content">
        <p id={id + "-description"}>{description}</p>
        {children}
        {error && (
          <div className="confirmation-dialog-error error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="secondary"
              onClick={onReload}
              disabled={busy}
            >
              {reloadLabel}
            </button>
          </div>
        )}
      </div>
      <footer className="actions">
        <button
          type="button"
          className="secondary"
          ref={cancel}
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={onConfirm}>
          {busy ? "Working…" : error ? retryLabel : confirmLabel}
        </button>
      </footer>
    </dialog>
  );
}
