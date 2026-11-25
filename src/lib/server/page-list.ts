import "server-only";
import { database } from "./db";
import type { PageCardData } from "../pages";
import type { PageCard } from "../organization";
import { pageListSize, type PageListQuery } from "../page-list";
import type { Category } from "../organization";

export async function adminPageBatch(query: PageListQuery) {
  const sql = database();
  const sorts = {
    manual: sql`array_position(o.ids,p.id) asc nulls last,p.updated_at desc,p.id`,
    "title-asc": sql`lower(p.title) asc,p.id`,
    "title-desc": sql`lower(p.title) desc,p.id`,
    "created-desc": sql`p.created_at desc,p.id`,
    "created-asc": sql`p.created_at asc,p.id`,
    "page-date-desc": sql`p.page_date desc nulls last,p.created_at desc,p.id`,
    "page-date-asc": sql`p.page_date asc nulls last,p.created_at desc,p.id`,
    "updated-desc": sql`p.updated_at desc,p.id`,
    "updated-asc": sql`p.updated_at asc,p.id`,
  };
  const rows = await sql<PageCardData[]>`
    select p.id,p.title,p.slug,p.visibility,p.created_at,p.updated_at,p.page_date,p.version,p.deleted_at,
      exists(select 1 from garden_settings where homepage_id=p.id) as is_homepage
    from pages p left join garden_admin_list_order o on o.list='pages'
    where p.deleted_at is null and (${!query.search} or strpos(lower(p.title),lower(${query.search}))>0 or strpos('/garden/'||lower(p.slug),lower(${query.search}))>0)
    order by ${sorts[query.sort]}
    limit ${pageListSize + 1} offset ${(query.page - 1) * pageListSize}`;
  return {
    pages: JSON.parse(
      JSON.stringify(rows.slice(0, pageListSize)),
    ) as PageCardData[],
    more: rows.length > pageListSize,
  };
}

export async function publicPageBatch(
  page: number,
  categoryId?: string,
  filters?: { search: string; year: string; excludeHomepage: boolean },
) {
  const sql = database();
  const rows = await sql<PageCard[]>`
    with recursive tree as (
      select id from page_categories where id=${categoryId ?? null}::uuid
      union select c.id from page_categories c join tree on c.parent_id=tree.id
    )
    select p.id,p.title,p.slug,to_char(p.page_date,'YYYY-MM-DD') as page_date,p.cover_photo_id,p.visibility
    from pages p where p.visibility='public' and p.deleted_at is null
      ${categoryId ? sql`and p.category_ids && array(select id from tree)` : sql``}
      ${!categoryId || filters?.excludeHomepage ? sql`and not exists(select 1 from garden_settings where homepage_id=p.id)` : sql``}
      ${filters?.search ? sql`and (strpos(lower(p.title),lower(${filters.search}))>0 or strpos(lower(p.slug),lower(${filters.search}))>0)` : sql``}
      ${filters?.year ? sql`and p.page_date >= ${filters.year + "-01-01"}::date and p.page_date < (${filters.year + "-01-01"}::date + interval '1 year')` : sql``}
    order by p.page_date desc nulls last,p.created_at desc,p.id
    limit ${pageListSize + 1} offset ${(page - 1) * pageListSize}`;
  return {
    cards: rows.slice(0, pageListSize),
    more: rows.length > pageListSize,
  };
}

export async function publicGardenFacets() {
  const sql = database();
  const [years, categories] = await Promise.all([
    sql<
      { year: string }[]
    >`select distinct to_char(p.page_date,'YYYY') as year from pages p
      where p.visibility='public' and p.deleted_at is null and p.page_date is not null
      and not exists(select 1 from garden_settings where homepage_id=p.id) order by year desc`,
    sql<Category[]>`with recursive visible as (
      select c.id,c.name,c.slug,c.parent_id from page_categories c where exists(
        select 1 from pages p where p.visibility='public' and p.deleted_at is null and c.id=any(p.category_ids)
        and not exists(select 1 from garden_settings where homepage_id=p.id))
      union
      select c.id,c.name,c.slug,c.parent_id from page_categories c join visible child on child.parent_id=c.id
    ) select * from visible order by lower(name),id`,
  ]);
  return { years: years.map(({ year }) => year), categories };
}
