"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PublicMenuItem } from "@/lib/destinations";

function NavigationItem({
  item,
  items,
}: {
  item: PublicMenuItem;
  items: PublicMenuItem[];
}) {
  const [open, setOpen] = useState(false),
    id = useId();
  const row = useRef<HTMLLIElement>(null),
    toggle = useRef<HTMLButtonElement>(null);
  const children = items.filter((child) => child.parentId === item.id);
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
      <a
        href={item.href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener" : undefined}
        aria-description={item.openInNewTab ? "Opens in a new tab" : undefined}
      >
        {item.label}
      </a>
      {children.length > 0 && (
        <>
          <button
            ref={toggle}
            type="button"
            className="submenu-toggle"
            aria-label={"Submenu for " + item.label}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
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
          </button>
          <div
            id={id}
            className="public-submenu"
            data-open={open}
            inert={!open}
          >
            <div className="public-submenu-inner">
              <ul className="public-menu-items">
                {children.map((child) => (
                  <NavigationItem key={child.id} item={child} items={items} />
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </li>
  );
}
export function WebsiteNavigation({ items }: { items: PublicMenuItem[] }) {
  return (
    <ul className="public-menu-items">
      {items
        .filter((item) => !item.parentId)
        .map((item) => (
          <NavigationItem key={item.id} item={item} items={items} />
        ))}
    </ul>
  );
}
