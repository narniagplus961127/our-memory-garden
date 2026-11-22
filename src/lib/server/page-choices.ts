import "server-only";
import { database } from "./db";
import { RequestError } from "./http";
import {
  pageChoiceBatchSize,
  type PageChoice,
  type PageChoices,
} from "../page-choices";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
function readCursor(
  value: string | null,
): { title: string; id: string } | null {
  if (!value) return null;
  try {
    if (value.length > 1600 || !/^[\w-]+$/.test(value)) throw Error();
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof cursor.title !== "string" ||
      cursor.title.length > 200 ||
      cursor.title.includes("\0") ||
      typeof cursor.id !== "string" ||
      !uuid.test(cursor.id)
    )
      throw Error();
    return { title: cursor.title, id: cursor.id };
  } catch {
    throw new RequestError(400, "Invalid page choices cursor.");
  }
}

export async function pageChoices(
  query: URLSearchParams,
): Promise<PageChoices> {
  const sql = database();
  if (query.has("ids")) {
    if ((query.get("ids") ?? "").length > 3700)
      throw new RequestError(400, "Choose up to 100 valid page IDs.");
    const ids = [...new Set((query.get("ids") ?? "").split(","))];
    if (ids.length > 100 || ids.some((id) => !uuid.test(id)))
      throw new RequestError(400, "Choose up to 100 valid page IDs.");
    const pages = await sql<PageChoice[]>`
      select id,title,slug,visibility from pages
      where deleted_at is null and id in ${sql(ids)}
      order by lower(title),id`;
    return { pages, nextCursor: null };
  }
  const search = (query.get("search") ?? "").trim();
  if (search.length > 200 || search.includes("\0"))
    throw new RequestError(400, "Search must be 200 characters or fewer.");
  const cursor = readCursor(query.get("after"));
  const rows = await sql<(PageChoice & { cursorTitle: string })[]>`
    select id,title,slug,visibility,lower(title) as "cursorTitle" from pages
    where deleted_at is null
      ${search ? sql`and (strpos(lower(title),lower(${search}))>0 or strpos(lower(slug),lower(${search}))>0)` : sql``}
      ${cursor ? sql`and (lower(title),id) > (${cursor.title},${cursor.id}::uuid)` : sql``}
    order by lower(title),id
    limit ${pageChoiceBatchSize + 1}`;
  const page = rows.slice(0, pageChoiceBatchSize);
  const last = page.at(-1);
  return {
    pages: page.map(({ cursorTitle, ...choice }) => choice),
    nextCursor:
      rows.length > pageChoiceBatchSize && last
        ? Buffer.from(
            JSON.stringify({ title: last.cursorTitle, id: last.id }),
          ).toString("base64url")
        : null,
  };
}
