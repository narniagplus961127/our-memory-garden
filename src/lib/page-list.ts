export const pageListSize = 24;
export const pageSortOptions = [
  { value: "manual", label: "Manual order" },
  { value: "title-asc", label: "Name A–Z" },
  { value: "title-desc", label: "Name Z–A" },
  { value: "created-desc", label: "Created date · newest first" },
  { value: "created-asc", label: "Created date · oldest first" },
  { value: "page-date-desc", label: "Page date · newest first" },
  { value: "page-date-asc", label: "Page date · oldest first" },
  { value: "updated-desc", label: "Recently updated" },
  { value: "updated-asc", label: "Least recently updated" },
] as const;
export type PageSort = (typeof pageSortOptions)[number]["value"];
export type PageListQuery = { page: number; search: string; sort: PageSort };
export type PageSearchParams = Record<string, string | string[] | undefined>;
export function readPageListQuery(params: PageSearchParams): PageListQuery {
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  return {
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
    search: typeof params.q === "string" ? params.q.trim().slice(0, 200) : "",
    sort:
      pageSortOptions.find(({ value }) => value === params.sort)?.value ??
      "page-date-desc",
  };
}
export function pageListHref(
  path: string,
  page: number,
  query?: PageListQuery,
) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query?.search) params.set("q", query.search);
  if (query && query.sort !== "page-date-desc") params.set("sort", query.sort);
  return path + (params.size ? "?" + params : "");
}
