import { readPageListQuery, type PageSearchParams } from "./page-list";
import { uuid } from "./organization";
export function readGardenQuery(params: PageSearchParams) {
  const base = readPageListQuery(params);
  return {
    page: base.page,
    search: base.search.replace(/\0/g, ""),
    year:
      typeof params.year === "string" &&
      /^\d{4}$/.test(params.year) &&
      Number(params.year) > 0
        ? params.year
        : "",
    categoryId:
      typeof params.category === "string" && uuid.test(params.category)
        ? params.category.toLowerCase()
        : "",
  };
}
export function gardenFilterParams(query: ReturnType<typeof readGardenQuery>) {
  return { q: query.search, year: query.year, category: query.categoryId };
}
