"use client";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
export function PublicMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Open website menu"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="website-menu"
        overlayClassName="website-menu-overlay"
        showCloseButton={false}
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (!(event.target instanceof Element)) return;
          let item = event.target.closest(".has-submenu");
          while (item) {
            const trigger = item.querySelector<HTMLButtonElement>(
              ":scope > .submenu-toggle[aria-expanded='true']",
            );
            if (trigger) {
              event.preventDefault();
              trigger.focus({ preventScroll: true });
              trigger.click();
              return;
            }
            item = item.parentElement?.closest(".has-submenu") ?? null;
          }
        }}
      >
        <header className="website-menu-header">
          <SheetTitle>Menu</SheetTitle>
          <SheetClose className="website-menu-close" aria-label="Close menu">
            <X aria-hidden="true" />
          </SheetClose>
        </header>
        <nav
          aria-label="Main navigation"
          onClick={(event) => {
            if (
              !event.defaultPrevented &&
              event.target instanceof Element &&
              event.target.closest("a")
            )
              setOpen(false);
          }}
        >
          {children}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
