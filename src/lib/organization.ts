export type Category = { id: string; name: string };
export type PageDetails = {
  date: string | null;
  categoryId: string | null;
  coverPhotoId: string | null;
};
export type GridSelection = {
  mode: "manual" | "category";
  pageIds: string[];
  categoryId: string;
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
export function validGrid(value: unknown): value is GridSelection {
  if (!value || typeof value !== "object") return false;
  const v = value as GridSelection;
  if (
    Object.keys(v).some(
      (key) => !["mode", "pageIds", "categoryId"].includes(key),
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
    (v.categoryId === "" || uuid.test(v.categoryId))
  );
}
