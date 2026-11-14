import "server-only";
import type postgres from "postgres";
import { mapPhotoGrids, photoGridRef } from "../photo-grid";
import {
  makePageJson,
  parsePageJson,
  type JsonGridPhoto,
  type JsonGridPhotos,
} from "../page-json";
import type { GardenPage, PageData } from "../pages";
import { validSlug } from "../page-address";
import { uuid } from "../organization";
import { database } from "./db";
import { RequestError, pageTitle } from "./http";
import { validatePageReferences } from "./page-references";
import type { Administrator } from "./pages";

type Sql = postgres.TransactionSql;
type ParsedPage = ReturnType<typeof parsePageJson>;

async function getPage(sql: Sql, id: string, lock = false) {
  if (!uuid.test(id)) throw new RequestError(404, "Page not found.");
  const [page] = await sql<GardenPage[]>`
    select * from pages where id=${id} and deleted_at is null
    ${lock ? sql`for update` : sql``}
  `;
  if (!page) throw new RequestError(404, "Page not found.");
  return page;
}

async function pageFile(sql: Sql, page: GardenPage) {
  const refs = new Map<string, string>();
  const photos: JsonGridPhotos = new Map();
  mapPhotoGrids(page.content, (block) => {
    const ref = photoGridRef(block);
    if (ref) {
      refs.set(ref.gridId, block.props.id);
      photos.set(block.props.id, []);
    }
    return block;
  });
  if (refs.size > 0) {
    const rows = await sql<(JsonGridPhoto & { gridId: string })[]>`
      select entry.grid_id as "gridId", entry.photo_id as "photoId",
        entry.alt, entry.caption
      from garden_grid_refs(${sql.json(page.content)}) ref
      join photo_grids grid on grid.id=ref.grid_id and grid.page_id=${page.id}
      join photo_grid_entries entry on entry.grid_id=grid.id
        and entry.first_revision<=ref.revision
        and (entry.end_revision is null or entry.end_revision>ref.revision)
      order by entry.grid_id, entry.position, entry.entry_id
    `;
    for (const { gridId, ...photo } of rows) {
      const blockId = refs.get(gridId);
      if (blockId) photos.get(blockId)?.push(photo);
    }
  }
  return makePageJson(page, photos);
}

export async function exportPageJson(id: string) {
  return database().begin(
    "isolation level repeatable read read only",
    async (sql) => pageFile(sql, await getPage(sql, id)),
  );
}

function parsed(file: unknown): ParsedPage {
  try {
    return parsePageJson(file);
  } catch (error) {
    throw new RequestError(
      400,
      error instanceof Error ? error.message : "Invalid page JSON.",
    );
  }
}

function checkImport(
  page: GardenPage,
  incoming: ParsedPage,
  version?: unknown,
) {
  if (
    (version !== undefined && Number(version) !== page.version) ||
    (incoming.source?.pageId.toLowerCase() === page.id &&
      incoming.source.version !== page.version)
  ) {
    throw new RequestError(
      409,
      "This page changed after the export or review. Download a fresh copy and review your edits again.",
    );
  }
}

async function checkReferences(
  sql: Sql,
  incoming: ParsedPage,
  previous: PageData,
) {
  await validatePageReferences(incoming.content, previous, sql);
  const photos = Array.from(incoming.gridPhotos.values()).flatMap((grid) =>
    grid.map(({ photoId }) => photoId),
  );
  const wanted = await sql<{ id: string; ready: boolean }[]>`
    with refs as (
      select id from garden_photo_ids(${sql.json(incoming.content)}) photo(id)
      union select id from garden_photo_ids(${sql.json(incoming.details)}) photo(id)
      union select id::uuid from jsonb_array_elements_text(${sql.json(photos)}) item(id)
    )
    select refs.id, found.id is not null as ready from refs
    left join lateral (
      select id from media_photos where id=refs.id and status='ready' for share
    ) found on true order by refs.id
  `;
  const missing = wanted.filter(({ ready }) => !ready);
  if (missing.length) {
    const ids = missing
      .slice(0, 3)
      .map(({ id }) => id)
      .join(", ");
    throw new RequestError(
      400,
      "Unavailable Media Library photos: " +
        ids +
        (missing.length > 3 ? " and more" : "") +
        ". Replace or remove these IDs in the JSON file.",
    );
  }
  return wanted.length;
}

async function lockCategory(sql: Sql, categoryId: string | null) {
  if (
    categoryId &&
    !(
      await sql`select id from page_categories where id=${categoryId} for key share`
    ).length
  )
    throw new RequestError(
      400,
      "The selected category is unavailable. Change or remove its ID in the JSON file.",
    );
}

function prepareGrids(incoming: ParsedPage) {
  const grids: { id: string; blockId: string; photos: JsonGridPhoto[] }[] = [];
  const content = mapPhotoGrids(incoming.content, (block) => {
    const id = crypto.randomUUID();
    const blockId = block.props.id;
    grids.push({ id, blockId, photos: incoming.gridPhotos.get(blockId) ?? [] });
    return { ...block, props: { ...block.props, gridId: id, gridRevision: 1 } };
  });
  return { content, grids };
}

async function writeGrids(
  sql: Sql,
  pageId: string,
  grids: ReturnType<typeof prepareGrids>["grids"],
) {
  for (const { id, blockId, photos } of grids) {
    await sql`insert into photo_grids (id,page_id,block_id) values (${id},${pageId},${blockId})`;
    if (photos.length)
      await sql`
        insert into photo_grid_entries(grid_id,entry_id,photo_id,position,alt,caption,first_revision)
        select ${id},gen_random_uuid(),(item->>'photoId')::uuid,position,item->>'alt',item->>'caption',1
        from jsonb_array_elements(${sql.json(photos)}) with ordinality photos(item,position)
      `;
  }
}

export async function reviewPageJson(id: string, file: unknown) {
  const incoming = parsed(file);
  return database().begin(async (sql) => {
    const page = await getPage(sql, id);
    checkImport(page, incoming);
    await lockCategory(sql, incoming.details.categoryId);
    return {
      version: page.version,
      title: incoming.title,
      date: incoming.details.date,
      blocks: incoming.count,
      photos: await checkReferences(sql, incoming, page.content),
      visibility: page.visibility,
    };
  });
}

export async function importPageJson(
  id: string,
  admin: Administrator,
  file: unknown,
  version: unknown,
) {
  if (!Number.isSafeInteger(version) || Number(version) < 1)
    throw new RequestError(400, "Review the JSON file before importing.");
  const incoming = parsed(file);
  return database().begin(async (sql) => {
    // Category deletion locks its category before updating assigned pages.
    await lockCategory(sql, incoming.details.categoryId);
    const page = await getPage(sql, id, true);
    checkImport(page, incoming, version);
    await checkReferences(sql, incoming, page.content);
    const { content, grids } = prepareGrids(incoming);
    const d = incoming.details;
    await writeGrids(sql, id, grids);
    await sql`
      update pages set title=${incoming.title}, content=${sql.json(content)}, page_date=${d.date},
        category_id=${d.categoryId}, cover_photo_id=${d.coverPhotoId}, sharing_title=${d.sharingTitle},
        sharing_description=${d.sharingDescription}, sharing_cover_photo_id=${d.sharingCoverPhotoId},
        version=version+1, metadata_version=metadata_version+1, updated_at=now(), updated_by=${admin.id},
        edit_reason='import', edit_group_id=gen_random_uuid(), editor_session_id=null
      where id=${id}
    `;
    return { id };
  });
}

export async function copyPage(
  admin: Administrator,
  body: Record<string, unknown>,
) {
  const title = pageTitle(body.title);
  const { sourceId, slug, requestId } = body;
  if (
    typeof sourceId !== "string" ||
    !uuid.test(sourceId) ||
    typeof requestId !== "string" ||
    !uuid.test(requestId)
  )
    throw new RequestError(400, "Choose a page to copy.");
  if (!validSlug(slug))
    throw new RequestError(
      400,
      "Use 1–100 lowercase letters, numbers and single hyphens for the page URL.",
    );
  try {
    return await database().begin(async (sql) => {
      // A retry after an interrupted response returns the copy already created.
      await sql`select pg_advisory_xact_lock(hashtextextended(${"copy-page:" + requestId},0))`;
      const [existing] = await sql<
        { id: string; created_by: string; edit_reason: string }[]
      >`
        select id,created_by,edit_reason from pages where id=${requestId}
      `;
      if (existing) {
        if (existing.created_by !== admin.id || existing.edit_reason !== "copy")
          throw new RequestError(
            409,
            "This copy request has already been used.",
          );
        return { id: existing.id };
      }
      const sourceBeforeLock = await getPage(sql, sourceId);
      await lockCategory(sql, sourceBeforeLock.category_id ?? null);
      const source = await getPage(sql, sourceId, true);
      if (source.category_id !== sourceBeforeLock.category_id)
        throw new RequestError(
          409,
          "The source category changed. Review the source page and try again.",
        );
      const incoming = parsed(await pageFile(sql, source));
      await checkReferences(sql, incoming, source.content);
      const { content, grids } = prepareGrids(incoming);
      const d = incoming.details;
      await sql`
        insert into pages(id,title,slug,visibility,content,created_by,updated_by,page_date,category_id,
          cover_photo_id,sharing_title,sharing_description,sharing_cover_photo_id,allow_indexing,edit_reason)
        values (${requestId},${title},${slug as string},'private',${sql.json(content)},${admin.id},${admin.id},${d.date},${d.categoryId},
          ${d.coverPhotoId},${d.sharingTitle},${d.sharingDescription},${d.sharingCoverPhotoId},${source.allow_indexing ?? true},'copy')
      `;
      await writeGrids(sql, requestId, grids);
      return { id: requestId };
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    )
      throw new RequestError(
        409,
        "This page URL is already in use. Choose another URL.",
      );
    throw error;
  }
}
