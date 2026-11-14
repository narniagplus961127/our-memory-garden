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
import { uuid } from "../organization";
import { database } from "./db";
import { RequestError } from "./http";
import { validatePageReferences } from "./page-references";
import type { Administrator } from "./pages";

type Sql = postgres.TransactionSql;
type PageContent = ReturnType<typeof parsePageJson>;
type ImportSource = { file: unknown } | { sourcePageId: string };

async function getPage(sql: Sql, id: string, lock = false) {
  if (!uuid.test(id)) throw new RequestError(404, "Page not found.");
  const [page] = await sql<GardenPage[]>`
    select * from pages where id=${id} and deleted_at is null
    ${lock ? sql`for update` : sql``}
  `;
  if (!page) throw new RequestError(404, "Page not found.");
  return page;
}

async function readPageGridPhotos(sql: Sql, page: GardenPage) {
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
  return photos;
}

export async function exportPageJson(id: string) {
  return database().begin(
    "isolation level repeatable read read only",
    async (sql) => {
      const page = await getPage(sql, id);
      const photos = await readPageGridPhotos(sql, page);
      return { slug: page.slug, file: makePageJson(page.content, photos) };
    },
  );
}

export async function pageJsonSources(id: string) {
  if (!uuid.test(id)) throw new RequestError(404, "Page not found.");
  return database()<Pick<GardenPage, "id" | "title" | "slug">[]>`
    select id, title, slug from pages
    where id <> ${id} and deleted_at is null
    order by lower(title), slug
  `;
}

async function readImportSource(
  sql: Sql,
  destinationId: string,
  input: ImportSource,
): Promise<PageContent> {
  if ("sourcePageId" in input) {
    if (input.sourcePageId.toLowerCase() === destinationId.toLowerCase())
      throw new RequestError(400, "Choose a different source page.");
    const source = await getPage(sql, input.sourcePageId);
    const gridPhotos = await readPageGridPhotos(sql, source);
    return parsePageJson(makePageJson(source.content, gridPhotos));
  }
  const { file } = input;
  try {
    return parsePageJson(file);
  } catch (error) {
    throw new RequestError(
      400,
      error instanceof Error ? error.message : "Invalid page JSON.",
    );
  }
}

async function checkReferences(
  sql: Sql,
  incoming: PageContent,
  previous: PageData,
) {
  await validatePageReferences(incoming.content, previous, sql);
  const photos = Array.from(incoming.gridPhotos.values()).flatMap((grid) =>
    grid.map(({ photoId }) => photoId),
  );
  const wanted = await sql<{ id: string; ready: boolean }[]>`
    with refs as (
      select id from garden_photo_ids(${sql.json(incoming.content)}) photo(id)
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

function prepareGrids(incoming: PageContent) {
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

export async function reviewPageJson(id: string, input: ImportSource) {
  return database().begin(async (sql) => {
    const page = await getPage(sql, id);
    const incoming = await readImportSource(sql, id, input);
    return {
      blocks: incoming.count,
      photos: await checkReferences(sql, incoming, page.content),
      visibility: page.visibility,
    };
  });
}

export async function importPageJson(
  id: string,
  admin: Administrator,
  input: ImportSource,
) {
  return database().begin(async (sql) => {
    const page = await getPage(sql, id, true);
    const incoming = await readImportSource(sql, id, input);
    await checkReferences(sql, incoming, page.content);
    const { content, grids } = prepareGrids(incoming);
    const replacement = { ...content, root: page.content.root };
    await writeGrids(sql, id, grids);
    await sql`
      update pages set content=${sql.json(replacement)},
        version=version+1, updated_at=now(), updated_by=${admin.id},
        edit_reason='import', edit_group_id=gen_random_uuid(), editor_session_id=null
      where id=${id}
    `;
    return { id };
  });
}
