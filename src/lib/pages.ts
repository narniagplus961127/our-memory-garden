export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type TextStyle = "h1" | "h2" | "h3" | "h4" | "p" | "small";
export type PageData = {
  root: { props: Record<string, JsonValue> };
  content: Array<{
    type: string;
    props: { id: string; [key: string]: JsonValue };
  }>;
  zones?: Record<string, PageData["content"]>;
};
export type GardenPage = {
  is_homepage?: boolean;
  page_date?: string | null;
  category_id?: string | null;
  cover_photo_id?: string | null;
  metadata_version?: number;
  sharing_title?: string | null;
  sharing_description?: string | null;
  sharing_cover_photo_id?: string | null;
  allow_indexing?: boolean;
  id: string;
  title: string;
  slug: string;
  visibility: "private" | "public";
  content: PageData;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  deleted_at: string | null;
};
export type PageCardData = Pick<
  GardenPage,
  | "id"
  | "title"
  | "visibility"
  | "is_homepage"
  | "updated_at"
  | "version"
  | "deleted_at"
>;
export function pageCardData({
  id,
  title,
  visibility,
  is_homepage,
  updated_at,
  version,
  deleted_at,
}: GardenPage): PageCardData {
  return {
    id,
    title,
    visibility,
    is_homepage,
    updated_at,
    version,
    deleted_at,
  };
}
export function initialPageData(text = ""): PageData {
  return {
    root: { props: {} },
    content: [
      { type: "Text", props: { id: crypto.randomUUID(), text, style: "p" } },
    ],
    zones: {},
  };
}
