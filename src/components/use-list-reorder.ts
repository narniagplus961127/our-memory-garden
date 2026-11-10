"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { isMenuDescendant } from "@/lib/navigation";

type SortableItem = { id: string; label: string; parentId?: string | null };
type DropTarget = { id: string; placement: "before" | "after" | "inside" };

type Drag = {
  id: string;
  label: string;
  parentId: SortableItem["parentId"];
  index: number;
  original: number;
  originalParentId: SortableItem["parentId"];
  target?: DropTarget;
  input: "pointer" | "keyboard";
  x: number;
  y: number;
  valid: boolean;
};
type Press = {
  id: number;
  x: number;
  y: number;
  item: SortableItem;
  handle: HTMLButtonElement;
};

export function useListReorder<T extends SortableItem>(
  items: T[],
  busy: boolean,
  onReorder: (items: T[]) => void,
  changeParent?: (item: T, parentId: string | null) => T,
) {
  const instructionsId = useId();
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
        ".admin-list-drag-handle",
      );
      if (
        active.current?.input === "keyboard" &&
        handle !==
          rows.current
            .get(active.current.id)
            ?.querySelector(".admin-list-drag-handle")
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
  function begin(item: SortableItem, input: Drag["input"], x = 0, y = 0) {
    const siblings = items.filter((i) => i.parentId === item.parentId),
      index = siblings.findIndex((i) => i.id === item.id);
    update({
      id: item.id,
      label: item.label,
      parentId: item.parentId,
      index,
      original: index,
      originalParentId: item.parentId,
      input,
      x,
      y,
      valid: true,
    });
    setAnnouncement(
      `${item.label} picked up, position ${index + 1} of ${siblings.length}. ${changeParent ? "Use Up and Down to reorder, Left to outdent, or Right to nest." : "Use arrow keys to move."} Space or Enter to drop, Escape to cancel.`,
    );
  }
  function point(x: number, y: number) {
    const current = active.current;
    if (!current) return;
    if (changeParent) {
      const card = document.elementFromPoint(x, y)?.closest(".admin-list-row");
      const targetId = card?.parentElement?.dataset.reorderId;
      const target = items.find((item) => item.id === targetId);
      if (target && card) {
        if (
          target.id === current.id ||
          isMenuDescendant(items, target.id, current.id)
        ) {
          update({ ...current, x, y, valid: false });
          return;
        }
        const rect = card.getBoundingClientRect();
        const edge = Math.min(18, rect.height / 4);
        const placement =
          y < rect.top + edge
            ? "before"
            : y > rect.bottom - edge
              ? "after"
              : "inside";
        const parentId = placement === "inside" ? target.id : target.parentId;
        const siblings = items.filter(
          (item) => item.parentId === parentId && item.id !== current.id,
        );
        const index =
          placement === "inside"
            ? siblings.length
            : siblings.indexOf(target) + Number(placement === "after");
        update({
          ...current,
          parentId,
          index,
          target: { id: target.id, placement },
          valid: true,
          x,
          y,
        });
        return;
      }
    }
    const list = rows.current.get(current.id)?.parentElement,
      box = list?.getBoundingClientRect();
    const valid = Boolean(
      box &&
      x >= box.left - 24 &&
      x <= box.right + 24 &&
      y >= box.top - 32 &&
      y <= box.bottom + 32,
    );
    const parentId = current.originalParentId;
    const remaining = items.filter(
      (i) => i.parentId === parentId && i.id !== current.id,
    );
    let index = remaining.findIndex((item) => {
      const rect = rows.current.get(item.id)?.getBoundingClientRect();
      return rect && y < rect.top + rect.height / 2;
    });
    if (index < 0) index = remaining.length;
    update({ ...current, parentId, index, target: undefined, valid, x, y });
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
    const moved = items.find((i) => i.id === current.id);
    if (!moved) {
      cancel();
      return;
    }
    const siblings = items.filter(
      (i) => i.parentId === current.parentId && i.id !== current.id,
    );
    const parentChanged = current.parentId !== current.originalParentId;
    if (parentChanged && changeParent) {
      const next = items.filter((i) => i.id !== moved.id);
      const before = siblings[current.index];
      const last = siblings.at(-1);
      const index = before
        ? next.indexOf(before)
        : last
          ? next.indexOf(last) + 1
          : next.length;
      next.splice(index, 0, changeParent(moved, current.parentId ?? null));
      onReorder(next);
    } else if (current.index !== current.original) {
      siblings.splice(current.index, 0, moved);
      let n = 0;
      onReorder(
        items.map((i) => (i.parentId === current.parentId ? siblings[n++] : i)),
      );
    }
    clear();
    setAnnouncement(
      `${current.label} dropped${parentChanged ? ` ${location(current.parentId)}` : ""}, position ${current.index + 1}.`,
    );
    if (current.input === "keyboard" || parentChanged)
      requestAnimationFrame(() =>
        rows.current
          .get(current.id)
          ?.querySelector<HTMLButtonElement>(".admin-list-drag-handle")
          ?.focus({
            preventScroll: current.input === "pointer" || !parentChanged,
          }),
      );
  }
  function location(parentId: SortableItem["parentId"]) {
    const parent = items.find((i) => i.id === parentId);
    return parent ? `under ${parent.label}` : "at the top level";
  }
  function pointerDown(
    event: PointerEvent<HTMLButtonElement>,
    item: SortableItem,
  ) {
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
  function keyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    item: SortableItem,
  ) {
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
      return;
    }
    if (current?.id !== item.id || current.input !== "keyboard") return;
    const siblings = items.filter(
      (i) => i.parentId === current.parentId && i.id !== current.id,
    );
    if (
      changeParent &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      const parent = items.find((i) => i.id === current.parentId);
      const previous = siblings[current.index - 1];
      if (event.key === "ArrowRight" && previous) {
        const index = items.filter(
          (i) => i.parentId === previous.id && i.id !== item.id,
        ).length;
        update({
          ...current,
          parentId: previous.id,
          index,
          target: { id: previous.id, placement: "inside" },
        });
        setAnnouncement(
          `${item.label} ${location(previous.id)}, position ${index + 1}.`,
        );
      } else if (event.key === "ArrowLeft" && parent) {
        const parentSiblings = items.filter(
          (i) => i.parentId === parent.parentId && i.id !== item.id,
        );
        const index = parentSiblings.indexOf(parent) + 1;
        update({
          ...current,
          parentId: parent.parentId,
          index,
          target: { id: parent.id, placement: "after" },
        });
        setAnnouncement(
          `${item.label} ${location(parent.parentId)}, position ${index + 1}.`,
        );
      }
    } else if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const count = siblings.length + 1;
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
      update({ ...current, index, target: undefined });
      setAnnouncement(`${item.label}, position ${index + 1} of ${count}.`);
    }
  }
  const remaining = drag
    ? items.filter((i) => i.parentId === drag.parentId && i.id !== drag.id)
    : [];
  const marker = drag?.valid
    ? (drag.target ?? {
        id: (remaining[drag.index] ?? remaining.at(-1))?.id,
        placement: drag.index < remaining.length ? "before" : "after",
      })
    : undefined;
  return {
    drag,
    announcement,
    instructionsId,
    dropDescription:
      changeParent && drag?.valid && drag.target
        ? `Drop ${location(drag.parentId)}`
        : undefined,
    rowProps: (id: string) => ({
      ref: (node: HTMLLIElement | null) => {
        if (node) rows.current.set(id, node);
        else rows.current.delete(id);
      },
      "data-dragging": drag?.id === id || undefined,
      "data-reorder-id": id,
      "data-drop": id === marker?.id ? marker.placement : undefined,
    }),
    handleProps: (item: SortableItem) => ({
      "aria-label": "Drag " + item.label,
      "aria-describedby": instructionsId,
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
