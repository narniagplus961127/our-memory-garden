"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import type { MenuItem } from "@/lib/destinations";

type Drag = {
  id: string;
  label: string;
  parentId: string | null;
  index: number;
  original: number;
  input: "pointer" | "keyboard";
  x: number;
  y: number;
  valid: boolean;
};
type Press = {
  id: number;
  x: number;
  y: number;
  item: MenuItem;
  handle: HTMLButtonElement;
};

export function useMenuReorder(
  items: MenuItem[],
  busy: boolean,
  onReorder: (items: MenuItem[]) => void,
) {
  const [drag, setDrag] = useState<Drag | null>(null),
    [announcement, setAnnouncement] = useState("");
  const active = useRef<Drag | null>(null),
    press = useRef<Press | null>(null),
    rows = useRef(new Map<string, HTMLLIElement>()),
    animation = useRef<number | null>(null);
  function update(next: Drag | null) {
    active.current = next;
    setDrag(next);
  }
  function clear() {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    const held = press.current;
    press.current = null;
    update(null);
    if (held?.handle.hasPointerCapture(held.id))
      held.handle.releasePointerCapture(held.id);
  }
  function cancel() {
    if (active.current)
      setAnnouncement(active.current.label + " move cancelled.");
    clear();
  }
  useEffect(() => {
    // An edit or incoming save replaces the arrangement being dragged.
    cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, busy]);
  useEffect(() => {
    function blur() {
      cancel();
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && (active.current || press.current)) {
        event.preventDefault();
        cancel();
      }
    }
    function outside(event: globalThis.PointerEvent) {
      const handle = (event.target as Element).closest(
        ".navigation-drag-handle",
      );
      if (
        active.current?.input === "keyboard" &&
        handle !==
          rows.current
            .get(active.current.id)
            ?.querySelector(".navigation-drag-handle")
      )
        cancel();
    }
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", escape);
    window.addEventListener("pointerdown", outside, true);
    return () => {
      window.removeEventListener("blur", blur);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("pointerdown", outside, true);
      if (animation.current !== null) cancelAnimationFrame(animation.current);
    };
    // Refs hold the active gesture; the listener never reads an old arrangement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function begin(item: MenuItem, input: Drag["input"], x = 0, y = 0) {
    const siblings = items.filter((i) => i.parentId === item.parentId),
      index = siblings.findIndex((i) => i.id === item.id);
    update({
      id: item.id,
      label: item.label,
      parentId: item.parentId,
      index,
      original: index,
      input,
      x,
      y,
      valid: true,
    });
    setAnnouncement(
      `${item.label} picked up, position ${index + 1} of ${siblings.length}. Use arrow keys to move, Space or Enter to drop, Escape to cancel.`,
    );
  }
  function point(x: number, y: number) {
    const current = active.current;
    if (!current) return;
    const list = rows.current.get(current.id)?.parentElement,
      box = list?.getBoundingClientRect();
    const valid = Boolean(
      box &&
      x >= box.left - 24 &&
      x <= box.right + 24 &&
      y >= box.top - 32 &&
      y <= box.bottom + 32,
    );
    const remaining = items.filter(
      (i) => i.parentId === current.parentId && i.id !== current.id,
    );
    let index = remaining.findIndex((item) => {
      const rect = rows.current.get(item.id)?.getBoundingClientRect();
      return rect && y < rect.top + rect.height / 2;
    });
    if (index < 0) index = remaining.length;
    update({ ...current, index, valid, x, y });
  }
  function scroll() {
    const current = active.current;
    if (current?.input !== "pointer") return;
    const step =
      current.y < 72 ? -16 : current.y > window.innerHeight - 72 ? 16 : 0;
    if (step) {
      window.scrollBy(0, step);
      point(current.x, current.y);
    }
    animation.current = requestAnimationFrame(scroll);
  }
  function drop() {
    const current = active.current;
    if (!current) {
      clear();
      return;
    }
    if (!current.valid) {
      cancel();
      return;
    }
    const siblings = items.filter((i) => i.parentId === current.parentId),
      moved = siblings.find((i) => i.id === current.id);
    if (!moved) {
      cancel();
      return;
    }
    const reordered = siblings.filter((i) => i.id !== current.id);
    reordered.splice(current.index, 0, moved);
    let n = 0;
    const next = items.map((i) =>
      i.parentId === current.parentId ? reordered[n++] : i,
    );
    clear();
    setAnnouncement(
      `${current.label} dropped, position ${current.index + 1} of ${siblings.length}.`,
    );
    if (current.index !== current.original) onReorder(next);
    if (current.input === "keyboard")
      requestAnimationFrame(() =>
        rows.current
          .get(current.id)
          ?.querySelector<HTMLButtonElement>(".navigation-drag-handle")
          ?.focus({ preventScroll: true }),
      );
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, item: MenuItem) {
    if (busy || !event.isPrimary || event.button !== 0 || active.current)
      return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    press.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      item,
      handle: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const held = press.current;
    if (!held || held.id !== event.pointerId) return;
    if (!active.current) {
      if (Math.hypot(event.clientX - held.x, event.clientY - held.y) < 6)
        return;
      begin(held.item, "pointer", event.clientX, event.clientY);
      animation.current = requestAnimationFrame(scroll);
    }
    point(event.clientX, event.clientY);
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, item: MenuItem) {
    if (busy) return;
    const current = active.current;
    if (event.key === "Escape" && (current || press.current)) {
      event.preventDefault();
      cancel();
      return;
    }
    if (current && event.key === "Tab") {
      cancel();
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!current) begin(item, "keyboard");
      else if (current.id === item.id) drop();
    } else if (
      current?.id === item.id &&
      current.input === "keyboard" &&
      ["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
      const count = items.filter((i) => i.parentId === current.parentId).length;
      const index = Math.max(
        0,
        Math.min(
          count - 1,
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : current.index + (event.key === "ArrowUp" ? -1 : 1),
        ),
      );
      update({ ...current, index });
      setAnnouncement(`${item.label}, position ${index + 1} of ${count}.`);
    }
  }
  const remaining = drag
    ? items.filter((i) => i.parentId === drag.parentId && i.id !== drag.id)
    : [];
  const markerId = drag?.valid
    ? (remaining[drag.index] ?? remaining.at(-1))?.id
    : undefined;
  return {
    drag,
    announcement,
    registerRow: (id: string, node: HTMLLIElement | null) => {
      if (node) rows.current.set(id, node);
      else rows.current.delete(id);
    },
    marker: (id: string) =>
      id === markerId
        ? drag!.index < remaining.length
          ? "before"
          : "after"
        : undefined,
    handleProps: (item: MenuItem) => ({
      "aria-label": "Drag " + item.label,
      "aria-describedby": "menu-drag-instructions",
      "aria-pressed": drag?.id === item.id,
      "aria-disabled": busy,
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) =>
        pointerDown(event, item),
      onPointerMove: pointerMove,
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        if (press.current?.id === event.pointerId) drop();
      },
      onPointerCancel: cancel,
      onLostPointerCapture: () => {
        if (press.current) cancel();
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
        keyDown(event, item),
    }),
  };
}
