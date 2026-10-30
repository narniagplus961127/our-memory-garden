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
export function initialPageData(text = ""): PageData {
  return {
    root: { props: {} },
    content: [
      { type: "Text", props: { id: crypto.randomUUID(), text, style: "p" } },
    ],
    zones: {},
  };
}
