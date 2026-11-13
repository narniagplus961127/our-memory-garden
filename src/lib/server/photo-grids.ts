import "server-only";
import type postgres from "postgres";
import type { GardenPage, PageData } from "../pages";
import {
  findPhotoGrid,
  mapPhotoGrids,
  photoGridAddLimit,
  photoGridBatchSize,
  photoGridRef,
  type GridPhoto,
  type GridPhotoBatch,
  type PhotoGridChange,
  type PhotoGridRef,
} from "../photo-grid";
import { uuid } from "../organization";
import { database } from "./db";
import { RequestError } from "./http";
import type { Administrator } from "./pages";

type Sql = postgres.TransactionSql;
const missingGrid = () => new RequestError(404, "Photo grid not found.");
const gridChanged = () =>
  new RequestError(
    409,
    "This photo grid changed. Refresh the photos and try again.",
  );

async function assertReady(sql: Sql, ids: string[]) {
  const unique = [...new Set(ids)];
  const rows =
    await sql`select id from media_photos where id in ${sql(unique)} and status='ready' order by id for share`;
  if (rows.length !== unique.length)
    throw new RequestError(
      409,
      "Choose photos that are still available in the Media Library.",
    );
}

async function cloneGrid(
  sql: Sql,
  pageId: string,
  blockId: string,
  source?: PhotoGridRef,
) {
  const [grid] = await sql<
    { id: string }[]
  >`insert into photo_grids(page_id,block_id) values(${pageId},${blockId}) returning id`;
  if (source) {
    await sql`select p.id from media_photos p where p.status='ready' and exists(
      select 1 from photo_grid_entries e where e.photo_id=p.id and e.grid_id=${source.gridId} and e.first_revision<=${source.gridRevision} and (e.end_revision is null or e.end_revision>${source.gridRevision})
    ) order by p.id for share`;
    const [missing] =
      await sql`select 1 from photo_grid_entries e left join media_photos p on p.id=e.photo_id and p.status='ready'
      where e.grid_id=${source.gridId} and e.first_revision<=${source.gridRevision} and (e.end_revision is null or e.end_revision>${source.gridRevision}) and p.id is null limit 1`;
    if (missing)
      throw new RequestError(
        409,
        "A photo in this saved grid is unavailable. Current content is preserved.",
      );
    await sql`insert into photo_grid_entries(grid_id,entry_id,photo_id,position,alt,caption,first_revision)
      select ${grid.id},gen_random_uuid(),photo_id,row_number() over(order by position,entry_id),alt,caption,1 from photo_grid_entries
      where grid_id=${source.gridId} and first_revision<=${source.gridRevision} and (end_revision is null or end_revision>${source.gridRevision})`;
  }
  return { gridId: grid.id, gridRevision: 1 };
}

export async function savePhotoGridRefs(
  sql: Sql,
  pageId: string,
  current: PageData | null,
  next: PageData,
  restore = false,
) {
  const changes: { blockId: string; source: PhotoGridRef | null }[] = [];
  mapPhotoGrids(next, (block) => {
    changes.push({ blockId: block.props.id, source: photoGridRef(block) });
    return block;
  });
  if (!changes.length) return next;
  const refs = new Map<string, PhotoGridRef>();
  for (const { blockId, source } of changes) {
    const currentRef = current && photoGridRef(findPhotoGrid(current, blockId));
    if (!restore && currentRef) {
      refs.set(blockId, currentRef);
      continue;
    }
    if (source) {
      const [owner] =
        await sql`select revision from photo_grids where id=${source.gridId} and page_id=${pageId} and revision>=${source.gridRevision}`;
      if (!owner) throw missingGrid();
    }
    refs.set(
      blockId,
      await cloneGrid(sql, pageId, blockId, source ?? undefined),
    );
  }
  return mapPhotoGrids(next, (block) => ({
    ...block,
    props: { ...block.props, ...refs.get(block.props.id) },
  }));
}

export async function readGridBatch(
  ref: PhotoGridRef,
  offset: number,
  admin = false,
): Promise<GridPhotoBatch> {
  const sql = database();
  const rows = await sql<
    (GridPhoto & { total: number })[]
  >`select e.entry_id as "entryId",e.photo_id as "photoId",e.alt,e.caption,p.width,p.height,
    count(*) over()::int as total
    ${admin ? sql`,p.name` : sql``}
    from photo_grid_entries e join media_photos p on p.id=e.photo_id and p.status='ready'
    where e.grid_id=${ref.gridId} and e.first_revision<=${ref.gridRevision} and (e.end_revision is null or e.end_revision>${ref.gridRevision})
    order by e.position,e.entry_id limit ${photoGridBatchSize + 1} offset ${offset}`;
  return {
    photos: rows
      .slice(0, photoGridBatchSize)
      .map(({ total: _total, ...photo }) => photo),
    next: rows.length > photoGridBatchSize ? offset + photoGridBatchSize : null,
    total: rows[0]?.total ?? 0,
  };
}

export function parseGridChange(
  body: Record<string, unknown>,
): PhotoGridChange {
  const valid = (value: unknown): value is string =>
    typeof value === "string" && uuid.test(value);
  if (
    body.action === "add" &&
    Array.isArray(body.photos) &&
    body.photos.length > 0 &&
    body.photos.length <= photoGridAddLimit &&
    body.photos.every(
      (photo) => photo && valid(photo.entryId) && valid(photo.photoId),
    ) &&
    new Set(body.photos.map((photo) => photo.entryId)).size ===
      body.photos.length
  ) {
    return {
      action: "add",
      photos: body.photos.map(({ entryId, photoId }) => ({ entryId, photoId })),
    };
  }
  if (valid(body.entryId)) {
    if (body.action === "remove")
      return { action: "remove", entryId: body.entryId };
    if (
      body.action === "move" &&
      (body.before === null || valid(body.before)) &&
      body.before !== body.entryId
    )
      return { action: "move", entryId: body.entryId, before: body.before };
    if (
      body.action === "edit" &&
      typeof body.alt === "string" &&
      body.alt.length <= 1000 &&
      typeof body.caption === "string" &&
      body.caption.length <= 2000
    )
      return {
        action: "edit",
        entryId: body.entryId,
        alt: body.alt,
        caption: body.caption,
      };
  }
  throw new RequestError(400, "Invalid photo grid change.");
}

export async function changePhotoGrid(
  admin: Administrator,
  pageId: string,
  blockId: string,
  expected: PhotoGridRef,
  change: PhotoGridChange,
  requestId: string,
) {
  return database().begin(async (sql) => {
    const [page] = await sql<
      GardenPage[]
    >`select * from pages where id=${pageId} and deleted_at is null for update`;
    const ref = page && photoGridRef(findPhotoGrid(page.content, blockId));
    if (!page || !ref) throw missingGrid();
    if (ref.gridId !== expected.gridId) throw gridChanged();
    const [applied] =
      await sql`select 1 from photo_grid_requests where grid_id=${ref.gridId} and request_id=${requestId}`;
    if (applied) return { page, ref };
    if (ref.gridRevision !== expected.gridRevision) throw gridChanged();
    const revision = ref.gridRevision + 1;
    if (change.action === "add") {
      await assertReady(
        sql,
        change.photos.map(({ photoId }) => photoId),
      );
      await sql`insert into photo_grid_entries(grid_id,entry_id,photo_id,position,first_revision)
        select ${ref.gridId},entry.entry_id,entry.photo_id,base.position+entry.ordinality,${revision}
        from (select coalesce(max(position),0) as position from photo_grid_entries where grid_id=${ref.gridId} and end_revision is null) base
        cross join unnest(${sql.array(
          change.photos.map((p) => p.entryId),
          2950,
        )},${sql.array(
          change.photos.map((p) => p.photoId),
          2950,
        )})
        with ordinality as entry(entry_id,photo_id,ordinality)`;
    } else {
      const [entry] = await sql<
        { photo_id: string; position: string; alt: string; caption: string }[]
      >`
        update photo_grid_entries set end_revision=${revision} where grid_id=${ref.gridId} and entry_id=${change.entryId} and end_revision is null
        returning photo_id,position,alt,caption`;
      if (!entry) throw gridChanged();
      if (change.action !== "remove") {
        const position =
          change.action === "move"
            ? await positionBefore(sql, ref.gridId, change.before, revision)
            : entry.position;
        await sql`insert into photo_grid_entries(grid_id,entry_id,photo_id,position,alt,caption,first_revision)
          values(${ref.gridId},${change.entryId},${entry.photo_id},${position},${change.action === "edit" ? change.alt : entry.alt},${change.action === "edit" ? change.caption : entry.caption},${revision})`;
      }
    }
    const updatedRef = { ...ref, gridRevision: revision };
    const content = mapPhotoGrids(page.content, (block) =>
      block.props.id === blockId
        ? { ...block, props: { ...block.props, ...updatedRef } }
        : block,
    );
    await sql`update photo_grids set revision=${revision} where id=${ref.gridId}`;
    await sql`insert into photo_grid_requests(grid_id,request_id) values(${ref.gridId},${requestId})`;
    const [updated] = await sql<
      GardenPage[]
    >`update pages set content=${sql.json(content)},updated_at=now(),updated_by=${admin.id},
      edit_group_id=case when edit_reason='photo-grid' and updated_by=${admin.id} and updated_at>now()-interval '1 minute' then edit_group_id else gen_random_uuid() end,
      edit_reason='photo-grid',editor_session_id=null where id=${pageId} returning *`;
    return { page: updated, ref: updatedRef };
  });
}

async function positionBefore(
  sql: Sql,
  gridId: string,
  before: string | null,
  revision: number,
) {
  if (before === null) {
    const [end] = await sql<
      { position: string }[]
    >`select coalesce(max(position),0)+1 as position from photo_grid_entries where grid_id=${gridId} and end_revision is null`;
    return end.position;
  }
  const target = () => sql<{ position: string; digits: number }[]>`select
    candidate.position,scale(candidate.position) as digits
    from photo_grid_entries t cross join lateral (
      select coalesce((t.position+(select max(position) from photo_grid_entries
        where grid_id=${gridId} and end_revision is null and position<t.position))*0.5,t.position-1) as position
    ) candidate where t.grid_id=${gridId} and t.entry_id=${before} and t.end_revision is null`;
  let [next] = await target();
  if (!next) throw gridChanged();
  if (next.digits > 40) {
    // Preserve historical ordering while returning the active ranks to integers.
    await sql`with previous as (
      update photo_grid_entries set end_revision=${revision} where grid_id=${gridId} and end_revision is null
      returning entry_id,photo_id,position,alt,caption
    )
    insert into photo_grid_entries(grid_id,entry_id,photo_id,position,alt,caption,first_revision)
    select ${gridId},entry_id,photo_id,row_number() over(order by position,entry_id),alt,caption,${revision} from previous`;
    [next] = await target();
    if (!next) throw gridChanged();
  }
  return next.position;
}
