export const adminLists = ["pages", "categories", "templates"] as const;
export type AdminList = (typeof adminLists)[number];

export function isAdminList(value: unknown): value is AdminList {
  return adminLists.some((list) => list === value);
}

export type AdminListOrder = { ids: string[]; version: number };

export function mergeVisibleOrder(
  saved: string[],
  visible: string[],
  next: string[],
) {
  const shown = new Set(visible),
    known = new Set(saved);
  const complete = [...saved, ...visible.filter((id) => !known.has(id))];
  let position = 0;
  return complete.map((id) => (shown.has(id) ? next[position++] : id));
}

export function applyAdminListOrder<T extends { id: string }>(
  items: T[],
  ids: string[],
) {
  if (!ids.length) return items;
  const rank = new Map(ids.map((id, index) => [id, index]));
  return [...items].sort(
    (a, b) => (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length),
  );
}
