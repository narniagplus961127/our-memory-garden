import "server-only";
import { database } from "./db";
import type { GardenPage, PageData } from "../pages";
import { initialPageData } from "../pages";
import { getHomepage } from "./homepage";
import { RequestError } from "./http";
export type Administrator = { id: string; email: string; name: string };
const validId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function listPages(
  _administrator: Administrator,
): Promise<GardenPage[]> {
  const rows = await database()<
    GardenPage[]
  >`select pages.*, exists(select 1 from garden_settings where homepage_id=pages.id) as is_homepage from pages where deleted_at is null order by updated_at desc`;
  return JSON.parse(JSON.stringify(rows));
}
export async function getVisiblePage(
  id: string,
  administrator: Administrator | null,
): Promise<GardenPage | null> {
  if (!validId.test(id)) return null;
  const rows = await database()<
    GardenPage[]
  >`select pages.*, exists(select 1 from garden_settings where homepage_id=pages.id) as is_homepage from pages where id=${id} and deleted_at is null and (${Boolean(administrator)} or visibility='public') limit 1`;
  return rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
}
export async function createPrivatePage(
  administrator: Administrator,
  title: string,
): Promise<GardenPage> {
  const id = crypto.randomUUID();
  const slug = "page-" + id;
  const rows = await database()<
    GardenPage[]
  >`insert into pages(id,title,slug,content,created_by,updated_by) values (${id},${title},${slug},${database().json(initialPageData())},${administrator.id},${administrator.id}) returning *`;
  return JSON.parse(JSON.stringify(rows[0]));
}
export async function updatePageText(
  administrator: Administrator,
  id: string,
  title: string,
  text: string,
  version: number,
  visibility?: GardenPage["visibility"],
): Promise<GardenPage | null> {
  if (!validId.test(id)) return null;
  if (visibility === "private" && (await getHomepage())?.id === id)
    throw new RequestError(
      409,
      "The homepage stays public. Choose another homepage first.",
    );
  const rows = await database()<
    GardenPage[]
  >`update pages set title=${title},content=${database().json(initialPageData(text))},visibility=coalesce(${visibility ?? null},visibility),version=version+1,updated_at=now(),updated_by=${administrator.id} where id=${id} and version=${version} and deleted_at is null returning *`;
  return rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
}
export function firstText(data: PageData): string {
  return data.content
    .filter((block) => block.type === "Text")
    .map((block) =>
      typeof block.props.text === "string" ? block.props.text : "",
    )
    .join("\n\n");
}

export async function updatePageVisibility(
  administrator: Administrator,
  id: string,
  visibility: GardenPage["visibility"],
  version: number,
): Promise<GardenPage | null> {
  if (!validId.test(id)) return null;
  if (visibility === "private" && (await getHomepage())?.id === id)
    throw new RequestError(
      409,
      "The homepage stays public. Choose another homepage first.",
    );
  const rows = await database()<
    GardenPage[]
  >`update pages set visibility=${visibility}, version=version+1, updated_at=now(), updated_by=${administrator.id} where id=${id} and version=${version} and deleted_at is null returning *`;
  return rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
}
