"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import type { PublicMenuItem } from "@/lib/destinations";

function NavigationItem({
  item,
  items,
  mobile,
  depth,
}: {
  item: PublicMenuItem;
  items: PublicMenuItem[];
  mobile: boolean;
  depth: number;
}) {
  const [open, setOpen] = useState(false),
    id = useId();
  const row = useRef<HTMLLIElement>(null),
    toggle = useRef<HTMLButtonElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const children = items.filter((child) => child.parentId === item.id);
  function cancelTimer() {
    if (timer.current) clearTimeout(timer.current);
  }
  useEffect(() => () => cancelTimer(), []);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!row.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <li
      ref={row}
      className={children.length ? "has-submenu" : undefined}
      onPointerEnter={(event) => {
        cancelTimer();
        if (
          children.length &&
          !mobile &&
          depth === 0 &&
          event.pointerType === "mouse" &&
          window.matchMedia("(hover:hover)").matches
        )
          setOpen(true);
      }}
      onPointerLeave={() => {
        if (!mobile && !row.current?.contains(document.activeElement))
          timer.current = setTimeout(() => setOpen(false), 160);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) return;
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <a href={item.href}>{item.label}</a>
      {children.length > 0 && (
        <>
          <Button
            ref={toggle}
            type="button"
            variant="ghost"
            size="icon"
            className="submenu-toggle"
            aria-label={"Submenu for " + item.label}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => {
              cancelTimer();
              setOpen(!open);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                requestAnimationFrame(() =>
                  row.current
                    ?.querySelector<HTMLAnchorElement>(".public-submenu a")
                    ?.focus(),
                );
              }
            }}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          <div
            id={id}
            className={"public-submenu" + (mobile ? " mobile-submenu" : "")}
            data-depth={depth}
            data-open={open}
            inert={!open}
          >
            <div className="public-submenu-inner">
              <ul className="public-menu-items">
                {children.map((child) => (
                  <NavigationItem
                    key={child.id}
                    item={child}
                    items={items}
                    mobile={mobile}
                    depth={depth + 1}
                  />
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </li>
  );
}
export function WebsiteNavigation({
  items,
  mobile = false,
}: {
  items: PublicMenuItem[];
  mobile?: boolean;
}) {
  return (
    <ul className="public-menu-items">
      {items
        .filter((item) => !item.parentId)
        .map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            items={items}
            mobile={mobile}
            depth={0}
          />
        ))}
    </ul>
  );
}
