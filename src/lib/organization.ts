export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

export function categoryPath(category: Category, categories: Category[]) {
  const path = [category];
  const seen = new Set([category.id]);
  let parent = category.parent_id;
  while (parent && !seen.has(parent)) {
    const match = categories.find(({ id }) => id === parent);
    if (!match) break;
    path.unshift(match);
    seen.add(parent);
    parent = match.parent_id;
  }
  return path;
}

export function categoryLabels(categories: Category[]) {
  return new Map(
    categories.map((category) => [
      category.id,
      categoryPath(category, categories)
        .map(({ name }) => name)
        .join(" › "),
    ]),
  );
}

export function pageCategoryIds(page: {
  category_ids?: string[];
  category_id?: string | null;
}) {
  return page.category_ids ?? (page.category_id ? [page.category_id] : []);
}

export function validCategoryIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((id: unknown) => typeof id === "string" && uuid.test(id))
  );
}

export function sortedCategoryIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.toLowerCase()))].sort();
}

export type PageDetails = {
  date: string | null;
  categoryIds: string[];
  coverPhotoId: string | null;
  sharingTitle: string | null;
  sharingDescription: string | null;
  sharingCoverPhotoId: string | null;
  allowIndexing: boolean;
};
export type GridSelection = {
  mode: "manual" | "category";
  pageIds: string[];
  categoryId: string;
  limit?: number;
};
export type PageCard = {
  id: string;
  title: string;
  slug: string;
  page_date: string | null;
  cover_photo_id: string | null;
  visibility: "private" | "public";
};
export const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validPageGridLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function validGrid(value: unknown): value is GridSelection {
  if (!value || typeof value !== "object") return false;
  const v = value as GridSelection;
  if (
    Object.keys(v).some(
      (key) => !["mode", "pageIds", "categoryId", "limit"].includes(key),
    )
  )
    return false;
  return (
    (v.mode === "manual" || v.mode === "category") &&
    Array.isArray(v.pageIds) &&
    v.pageIds.length <= 100 &&
    v.pageIds.every((id) => typeof id === "string" && uuid.test(id)) &&
    new Set(v.pageIds).size === v.pageIds.length &&
    typeof v.categoryId === "string" &&
    (v.categoryId === "" || uuid.test(v.categoryId)) &&
    (v.limit === undefined || validPageGridLimit(v.limit))
  );
}
