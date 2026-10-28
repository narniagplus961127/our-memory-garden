import "server-only";
import { database } from "./db";
import { initialPageData, type GardenPage } from "../pages";
import type { Administrator } from "./pages";
import { RequestError } from "./http";
const HOMEPAGE_LOCK_ID = 4762731;

export async function getHomepage(): Promise<GardenPage | null> {
  const rows = await database()<
    GardenPage[]
  >`select pages.*, true as is_homepage from pages join garden_settings on pages.id=garden_settings.homepage_id where pages.visibility='public' and pages.deleted_at is null limit 1`;
  return rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
}

export async function ensureHomepage(
  administrator: Administrator,
): Promise<void> {
  if (await getHomepage()) return;
  await database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(${HOMEPAGE_LOCK_ID})`;
    if (
      (await sql`select homepage_id from garden_settings where singleton=true`)
        .length
    )
      return;
    const id = crypto.randomUUID();
    await sql`insert into pages(id,title,slug,visibility,content,created_by,updated_by) values (${id},'Our Memory Garden',${"our-garden-" + id},'public',${sql.json(initialPageData("A little place for the moments we share."))},${administrator.id},${administrator.id})`;
    await sql`insert into garden_settings(singleton,homepage_id) values (true,${id})`;
  });
}

export async function selectHomepage(
  administrator: Administrator,
  id: string,
): Promise<GardenPage> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new RequestError(400, "Choose a public page.");
  await database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(${HOMEPAGE_LOCK_ID})`;
    const rows =
      await sql`select id from pages where id=${id} and visibility='public' and deleted_at is null for update`;
    if (!rows.length)
      throw new RequestError(
        409,
        "Choose an available public page as the homepage.",
      );
    await sql`insert into garden_settings(singleton,homepage_id) values (true,${id}) on conflict(singleton) do update set homepage_id=excluded.homepage_id`;
  });
  const page = await getHomepage();
  if (!page)
    throw new RequestError(409, "The homepage changed. Please try again.");
  return page;
}
