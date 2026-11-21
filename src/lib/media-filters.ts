export type MediaFilters = {
  usage: "all" | "unused" | "used" | "public" | "private";
  from: string;
  to: string;
  pageId: string;
};
export const emptyMediaFilters: MediaFilters = {
  usage: "all",
  from: "",
  to: "",
  pageId: "",
};
export function mediaFilterParams(filters: MediaFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value && value !== "all"),
  );
}
export function validMediaFilters(filters: MediaFilters) {
  const validDate = (date: string) =>
    !date ||
    (/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date);
  return (
    ["all", "unused", "used", "public", "private"].includes(filters.usage) &&
    validDate(filters.from) &&
    validDate(filters.to) &&
    (!filters.from || !filters.to || filters.from <= filters.to) &&
    (!filters.pageId ||
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        filters.pageId,
      ))
  );
}
