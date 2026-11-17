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
  if (
    a.id !== b.id ||
    a.label !== b.label ||
    a.parentId !== b.parentId ||
    Boolean(a.openInNewTab) !== Boolean(b.openInNewTab)
  )
    return false;
  const first = a.destination;
  const second = b.destination;
  switch (first.kind) {
    case "page":
      return second.kind === "page" && first.pageId === second.pageId;
    case "category":
      return (
        second.kind === "category" && first.categoryId === second.categoryId
      );
    case "system":
      return second.kind === "system" && first.page === second.page;
    case "external":
      return second.kind === "external" && first.url === second.url;
  }
}
