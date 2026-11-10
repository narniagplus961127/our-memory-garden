import type { MenuItem } from "./destinations";

export type NavigationState = { items: MenuItem[]; version: number };

export function isMenuDescendant(
  items: { id: string; parentId?: string | null }[],
  id: string,
  ancestor: string,
) {
  const seen = new Set<string>();
  let current = items.find((item) => item.id === id);
  while (current?.parentId && !seen.has(current.id)) {
    if (current.parentId === ancestor) return true;
    seen.add(current.id);
    current = items.find((item) => item.id === current!.parentId);
  }
  return false;
}

export function sameMenuItem(a: MenuItem | undefined, b: MenuItem | undefined) {
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    a.label === b.label &&
    a.parentId === b.parentId &&
    Boolean(a.openInNewTab) === Boolean(b.openInNewTab) &&
    (a.destination.kind === "page" && b.destination.kind === "page"
      ? a.destination.pageId === b.destination.pageId
      : a.destination.kind === "category" && b.destination.kind === "category"
        ? a.destination.categoryId === b.destination.categoryId
        : a.destination.kind === "external" &&
          b.destination.kind === "external" &&
          a.destination.url === b.destination.url)
  );
}
