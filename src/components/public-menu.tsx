"use client";
import { useState, type ReactNode } from "react";
import { Modal } from "./modal";
import { Button } from "./ui/button";
export function PublicMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="public-menu">
      <Button
        type="button"
        variant="outline"
        aria-label="Open website menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        ☰
      </Button>
      {open && (
        <Modal
          title="Menu"
          onClose={() => setOpen(false)}
          className="website-menu"
          onEscapeKeyDown={(event) => {
            if (!(event.target instanceof Element)) return;
            let item = event.target.closest(".has-submenu");
            while (item) {
              const trigger = item.querySelector<HTMLButtonElement>(
                ":scope > .submenu-toggle[aria-expanded='true']",
              );
              if (trigger) {
                event.preventDefault();
                trigger.focus();
                trigger.click();
                return;
              }
              item = item.parentElement?.closest(".has-submenu") ?? null;
            }
          }}
        >
          <nav
            aria-label="Mobile navigation"
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest("a"))
                setOpen(false);
            }}
          >
            {children}
          </nav>
        </Modal>
      )}
    </div>
  );
}
