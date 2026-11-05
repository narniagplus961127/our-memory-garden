"use client";
import {
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type KeyboardEventHandler,
} from "react";
import { X } from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";

export function Modal({
  title,
  label,
  description,
  children,
  footer,
  onClose,
  busy = false,
  className,
  initialFocus,
  onKeyDown,
  onEscapeKeyDown,
  returnFocus,
  closeLabel,
}: {
  title: string;
  label?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  busy?: boolean;
  className?: string;
  initialFocus?: RefObject<HTMLButtonElement | null>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  returnFocus?: RefObject<HTMLElement | null>;
  closeLabel?: string;
}) {
  const close = useRef<HTMLButtonElement>(null);
  const hasBody =
    children !== undefined && children !== null && children !== false;
  const [previous] = useState(() =>
    typeof document === "undefined" ? null : document.activeElement,
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn("garden-modal", className)}
        aria-label={label}
        {...(label ? { "aria-labelledby": undefined } : {})}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (initialFocus?.current ?? close.current)?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => {
            const target = returnFocus?.current ?? previous;
            // Editor triggers belong to an iframe's HTMLElement realm.
            if (
              target &&
              target.isConnected &&
              "focus" in target &&
              typeof target.focus === "function"
            )
              target.focus();
          });
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
          else onEscapeKeyDown?.(event);
        }}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        aria-busy={busy}
      >
        <header
          className={cn(
            "garden-modal-header flex shrink-0 items-start justify-between gap-4 p-5 sm:p-6",
            hasBody && "border-b",
          )}
        >
          <div className="min-w-0">
            <DialogTitle className="m-0 font-serif text-2xl leading-tight font-normal break-words">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="mt-3 mb-0 text-sm leading-relaxed text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </div>
          <Button
            ref={close}
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label={closeLabel ?? "Close " + (label ?? title).toLowerCase()}
            title={closeLabel ?? "Close " + (label ?? title).toLowerCase()}
            disabled={busy}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </header>
        {hasBody && (
          <div className="garden-modal-body min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
            {children}
          </div>
        )}
        {footer && (
          <footer className="garden-modal-footer flex shrink-0 flex-wrap justify-end gap-3 border-t p-5 sm:p-6">
            {footer}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}
