import "server-only";
import { richFields, richPageReferences } from "../rich-text";
import { database } from "./db";
import { RequestError } from "./http";
import type { Administrator } from "./pages";
import type { GardenPage } from "../pages";
const validId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type Revision = {
  version: number;
  updated_at: string;
  actor: string;
  reason: string;
  group_id: string;
};
export type HistoryGroup = { id: string; versions: Revision[] };
export type InboundReference = { id: string; title: string; kind: string };
function pageId(id: string) {
  if (!validId.test(id)) throw new RequestError(404, "Page not found.");
}
export async function recoveryPage(id: string) {
  pageId(id);
  const [page] = await database()<
    GardenPage[]
  >`select pages.*,exists(select 1 from garden_settings where homepage_id=pages.id) as is_homepage from pages where id=${id}`;
  if (!page) throw new RequestError(404, "Page not found.");
  return JSON.parse(JSON.stringify(page)) as GardenPage;
}
export async function pageHistory(id: string) {
  const page = await recoveryPage(id);
  const rows = await database()<
    Revision[]
  >`select v.version,v.updated_at,coalesce(a.email,'Administrator') as actor,v.reason,v.group_id from page_versions v left join garden_administrators a on a.user_id=v.updated_by where v.page_id=${id} order by v.version desc`;
  const groups: HistoryGroup[] = [];
  for (const r of rows) {
    let g = groups.at(-1);
    if (!g || g.id !== r.group_id) {
      g = { id: r.group_id, versions: [] };
      groups.push(g);
    }
    g.versions.push(r);
  }
  return { page, groups };
}
export async function historicalPage(id: string, version: number) {
  await recoveryPage(id);
  expected(version);
  const [r] = await database()<
    { snapshot: GardenPage }[]
  >`select snapshot from page_versions where page_id=${id} and version=${version}`;
  if (!r) throw new RequestError(404, "Version not found.");
  return r;
}
function expected(version: unknown) {
  if (!Number.isSafeInteger(version) || Number(version) < 1)
    throw new RequestError(400, "Invalid current version.");
  return Number(version);
}
export async function restoreVersion(
  id: string,
  revision: number,
  version: unknown,
  admin: Administrator,
) {
  pageId(id);
  expected(revision);
  const wanted = expected(version);
  return database().begin(async (sql) => {
    const [page] = await sql<
      GardenPage[]
    >`select * from pages where id=${id} for update`;
    if (!page || page.deleted_at)
      throw new RequestError(404, "Page not found.");
    if (page.version !== wanted)
      throw new RequestError(
        409,
        "This page changed. Reload history before restoring; current content is preserved.",
      );
    const [r] = await sql<
      { snapshot: GardenPage }[]
    >`select snapshot from page_versions where page_id=${id} and version=${revision}`;
    if (!r) throw new RequestError(404, "Version not found.");
    const category = r.snapshot.category_id ?? null;
    const cover = r.snapshot.cover_photo_id ?? null;
    const sharingTitle = Object.hasOwn(r.snapshot, "sharing_title")
      ? (r.snapshot.sharing_title ?? null)
      : (page.sharing_title ?? null);
    const sharingDescription = Object.hasOwn(r.snapshot, "sharing_description")
      ? (r.snapshot.sharing_description ?? null)
      : (page.sharing_description ?? null);
    const sharingCover = Object.hasOwn(r.snapshot, "sharing_cover_photo_id")
      ? (r.snapshot.sharing_cover_photo_id ?? null)
      : (page.sharing_cover_photo_id ?? null);
    const allowIndexing = Object.hasOwn(r.snapshot, "allow_indexing")
      ? r.snapshot.allow_indexing
      : (page.allow_indexing ?? true);
    if (
      (sharingTitle !== null &&
        (typeof sharingTitle !== "string" || sharingTitle.length > 200)) ||
      (sharingDescription !== null &&
        (typeof sharingDescription !== "string" ||
          sharingDescription.length > 2000)) ||
      (sharingCover !== null &&
        (typeof sharingCover !== "string" || !validId.test(sharingCover))) ||
      typeof allowIndexing !== "boolean"
    )
      throw new RequestError(
        409,
        "These saved sharing settings are invalid. Current content is preserved.",
      );
    if (
      sharingCover &&
      !(
        await sql`select id from media_photos where id=${sharingCover} and status='ready' for share`
      ).length
    )
      throw new RequestError(
        409,
        "This saved sharing cover photo is unavailable. Current content is preserved.",
      );
    if (
      category &&
      !(
        await sql`select id from page_categories where id=${category} for key share`
      ).length
    )
      throw new RequestError(
        409,
        "This saved category is unavailable. Current content is preserved.",
      );
    if (
      cover &&
      !(
        await sql`select id from media_photos where id=${cover} and status='ready' for share`
      ).length
    )
      throw new RequestError(
        409,
        "This saved cover photo is unavailable. Current content is preserved.",
      );
    const [saved] = await sql<
      GardenPage[]
    >`update pages set title=${r.snapshot.title},content=${sql.json(r.snapshot.content)},page_date=${r.snapshot.page_date ?? null},category_id=${category},cover_photo_id=${cover},sharing_title=${sharingTitle},sharing_description=${sharingDescription},sharing_cover_photo_id=${sharingCover},allow_indexing=${allowIndexing},metadata_version=metadata_version+1,version=version+1,updated_at=now(),updated_by=${admin.id},edit_reason='restore',edit_group_id=${crypto.randomUUID()},editor_session_id=null where id=${id} returning *`;
    return saved;
  });
}
export async function listTrash() {
  return database()<
    GardenPage[]
  >`select * from pages where deleted_at is not null order by deleted_at desc`;
}
export async function inboundReferences(id: string) {
  const target = await recoveryPage(id);
  const pages = await database()<
    (GardenPage & { category_id?: string })[]
  >`select * from pages where deleted_at is null and id<>${id}`;
  const refs: InboundReference[] = [];
  function scan(value: unknown, page: GardenPage) {
    if (!value || typeof value !== "object") return;
    const v = value as Record<string, unknown>;
    if (typeof v.type === "string" && v.props && typeof v.props === "object") {
      const props = v.props as Record<string, unknown>;
      if (
        Object.values(richFields[v.type] ?? {}).some(
          (key) =>
            typeof props[key] === "string" &&
            richPageReferences(props[key] as string).includes(id),
        )
      )
        refs.push({
          id: page.id,
          title: page.title,
          kind: "Text or button link",
        });
      if (v.type === "Text" && typeof props.textRich === "string") return;
    }
    if (v.kind === "page" && v.pageId === id)
      refs.push({
        id: page.id,
        title: page.title,
        kind: "Text, button or image link",
      });
    if (v.type === "PageGrid") {
      const props = (v.props as Record<string, unknown>)?.selection as Record<
        string,
        unknown
      >;
      if (
        props?.mode === "manual" &&
        Array.isArray(props.pageIds) &&
        props.pageIds.includes(id)
      )
        refs.push({ id: page.id, title: page.title, kind: "Manual page grid" });
      if (
        props?.mode === "category" &&
        props.categoryId &&
        (target as GardenPage & { category_id?: string }).category_id ===
          props.categoryId
      )
        refs.push({
          id: page.id,
          title: page.title,
          kind: "Category page grid",
        });
    }
    for (const child of Object.values(v)) scan(child, page);
  }
  for (const p of pages) scan(p.content, p);
  const [nav] = await database()<
    {
      items: {
        label: string;
        destination: { kind: string; pageId?: string };
      }[];
    }[]
  >`select items from garden_navigation where singleton=true`;
  for (const item of nav?.items ?? [])
    if (item.destination.kind === "page" && item.destination.pageId === id)
      refs.push({ id: "navigation", title: item.label, kind: "Menu link" });
  return { page: target, references: refs };
}
export async function changeTrash(
  id: string,
  action: "trash" | "restore" | "delete",
  version: unknown,
  admin: Administrator,
) {
  pageId(id);
  const wanted = expected(version);
  return database().begin(async (sql) => {
    const [page] = await sql<
      GardenPage[]
    >`select pages.*,exists(select 1 from garden_settings where homepage_id=pages.id) as is_homepage from pages where id=${id} for update`;
    if (!page) throw new RequestError(404, "Page not found.");
    if (page.version !== wanted)
      throw new RequestError(
        409,
        "This page changed. Reload before trying again.",
      );
    if (page.is_homepage)
      throw new RequestError(
        409,
        "Choose another homepage before moving this page to trash.",
      );
    if (action === "trash" && page.deleted_at)
      throw new RequestError(409, "This page is already in trash.");
    if (action !== "trash" && !page.deleted_at)
      throw new RequestError(
        409,
        "Only pages already in trash can be restored or permanently deleted.",
      );
    if (action === "delete") {
      await sql`delete from pages where id=${id}`;
      return { deleted: true };
    }
    const [saved] = await sql<
      GardenPage[]
    >`update pages set deleted_at=${action === "trash" ? new Date() : null},visibility=${action === "restore" ? "private" : page.visibility},version=version+1,updated_at=now(),updated_by=${admin.id},edit_reason=${action === "trash" ? "trash" : "trash restore"},edit_group_id=${crypto.randomUUID()},editor_session_id=null where id=${id} returning *`;
    return saved;
  });
}
