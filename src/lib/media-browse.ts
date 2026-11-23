import {
  emptyMediaFilters,
  validMediaFilters,
  type MediaFilters,
} from "./media-filters";

export type MediaBrowseSettings = {
  query: string;
  filters: MediaFilters;
  grouped: boolean;
  filtersOpen: boolean;
};
export type MediaBrowseRecord = MediaBrowseSettings & {
  version: 1;
  savedAt: number;
  batches: number;
  scrollY: number;
};
export const defaultMediaBrowse: MediaBrowseSettings = {
  query: "",
  filters: emptyMediaFilters,
  grouped: false,
  filtersOpen: false,
};
export const mediaBrowseKey = (accountId: string) =>
  "garden-media-browse:" + encodeURIComponent(accountId);
export function readMediaBrowse(
  value: string | null,
): MediaBrowseRecord | null {
  try {
    const item = JSON.parse(value ?? "null");
    if (
      !item ||
      item.version !== 1 ||
      typeof item.query !== "string" ||
      item.query.length > 200 ||
      !item.filters ||
      !["from", "to", "pageId"].every(
        (key) => typeof item.filters[key] === "string",
      ) ||
      !validMediaFilters(item.filters) ||
      typeof item.grouped !== "boolean" ||
      typeof item.filtersOpen !== "boolean" ||
      !Number.isInteger(item.batches) ||
      item.batches < 1 ||
      item.batches > 50 ||
      !Number.isFinite(item.scrollY) ||
      item.scrollY < 0 ||
      item.scrollY > 5_000_000 ||
      !Number.isFinite(item.savedAt) ||
      item.savedAt > Date.now() + 60_000 ||
      Date.now() - item.savedAt > 12 * 3600_000
    )
      return null;
    return {
      version: 1,
      query: item.query,
      filters: {
        usage: item.filters.usage,
        from: item.filters.from,
        to: item.filters.to,
        pageId: item.filters.pageId,
      },
      grouped: item.grouped,
      filtersOpen: item.filtersOpen,
      savedAt: item.savedAt,
      batches: item.batches,
      scrollY: item.scrollY,
    };
  } catch {
    return null;
  }
}
export function clearMediaBrowse(accountId: string) {
  try {
    sessionStorage.removeItem(mediaBrowseKey(accountId));
  } catch {}
}
