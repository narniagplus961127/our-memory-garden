"use client";
import { useRef, type ReactNode, type RefObject } from "react";
import { Button } from "./ui/button";
import { Modal } from "./modal";
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
  confirmDisabled = false,
  returnFocus,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  busy: boolean;
  error: string;
  confirmLabel: string;
  retryLabel: string;
  reloadLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onReload?: () => void;
  confirmDisabled?: boolean;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      title={title}
      description={description}
      busy={busy}
      onClose={onCancel}
      initialFocus={cancel}
      returnFocus={returnFocus}
      className="confirmation-dialog"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            ref={cancel}
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {busy ? "Working…" : error ? retryLabel : confirmLabel}
          </Button>
        </>
      }
    >
      {children || error ? (
        <div className="confirmation-copy grid gap-4">
          {children}
          {error && (
            <div className="grid gap-3 text-destructive" role="alert">
              <p className="m-0">{error}</p>
              {onReload && reloadLabel && (
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-start"
                  disabled={busy}
                  onClick={onReload}
                >
                  {reloadLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
