"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Sprout, SquarePen } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function AdminShortcuts({ editPageId }: { editPageId?: string }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    hover = useRef(false);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function leave() {
    stop();
    if (hover.current) timer.current = setTimeout(() => setOpen(false), 180);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          className="garden-dashboard-fab"
          size="icon"
          aria-label="Garden tools"
          title="Garden tools"
          onPointerEnter={(event) => {
            if (
              event.pointerType === "mouse" &&
              matchMedia("(hover:hover)").matches
            ) {
              stop();
              hover.current = true;
              timer.current = setTimeout(() => setOpen(true), 120);
            }
          }}
          onPointerLeave={leave}
          onPointerDown={() => {
            stop();
            hover.current = false;
          }}
        >
          <Sprout aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        aria-label="Garden tools"
        className="w-60 rounded-xl border-border bg-background p-2 shadow-lg"
        onPointerEnter={stop}
        onPointerLeave={leave}
        onOpenAutoFocus={(event) => {
          if (hover.current) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          if (hover.current) event.preventDefault();
        }}
      >
        <nav aria-label="Garden shortcuts" className="grid gap-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/admin">
              <LayoutDashboard aria-hidden="true" />
              Garden dashboard
            </Link>
          </Button>
          {editPageId && (
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={"/admin/pages/" + editPageId}>
                <SquarePen aria-hidden="true" />
                Edit this page
              </Link>
            </Button>
          )}
        </nav>
      </PopoverContent>
    </Popover>
  );
}
