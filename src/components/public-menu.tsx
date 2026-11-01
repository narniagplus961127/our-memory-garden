"use client";
import { useRef, type ReactNode } from "react";
export function PublicMenu({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <div className="public-menu">
      <button
        type="button"
        aria-label="Open website menu"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        ☰
      </button>
      <dialog
        ref={dialog}
        className="website-menu"
        aria-labelledby="website-menu-heading"
      >
        <button
          type="button"
          className="website-menu-back"
          aria-label="Back"
          autoFocus
          onClick={() => dialog.current?.close()}
        >
          ← Back
        </button>
        <h1 id="website-menu-heading">Our garden</h1>
        <nav
          aria-label="Mobile navigation"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a"))
              dialog.current?.close();
          }}
        >
          {children}
        </nav>
      </dialog>
    </div>
  );
}
