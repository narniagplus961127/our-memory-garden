"use client";
import Link from "next/link";
import { LayoutDashboard, Sprout, SquarePen } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function AdminShortcuts({ editPageId }: { editPageId?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          className="garden-dashboard-fab"
          size="icon"
          aria-label="Garden tools"
          title="Garden tools"
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
