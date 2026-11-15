import "server-only";
import { database } from "./db";
import { RequestError } from "./http";
import type { Administrator } from "./pages";
import type { GardenPage } from "../pages";
import {
  pageCategoryIds,
  sortedCategoryIds,
  uuid,
  validCategoryIds,
  type GridSelection,
  type PageCard,
} from "../organization";
export { categories, editCategory } from "./categories";
export async function updateDetails(
  admin: Administrator,
  id: string,
  body: Record<string, unknown>,
) {
  if (!uuid.test(id)) throw new RequestError(404, "Page not found.");
  const {
    date,
    categoryId,
    categoryIds,
    coverPhotoId,
    metadataVersion,
    sharingTitle,
    sharingDescription,
    sharingCoverPhotoId,
    allowIndexing,
  } = body;
  if (
    [
      [sharingTitle, 200],
      [sharingDescription, 2000],
    ].some(
      ([value, limit]) =>
        value !== undefined &&
        value !== null &&
        (typeof value !== "string" || value.length > Number(limit)),
    ) ||
    (sharingCoverPhotoId !== undefined &&
      sharingCoverPhotoId !== null &&
      (typeof sharingCoverPhotoId !== "string" ||
        !uuid.test(sharingCoverPhotoId))) ||
    (allowIndexing !== undefined && typeof allowIndexing !== "boolean")
  )
    throw new RequestError(
      400,
      "Choose valid sharing details and a ready sharing cover photo.",
    );
  if (
    !Number.isSafeInteger(metadataVersion) ||
    Number(metadataVersion) < 0 ||
    (date !== null &&
      (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)) ||
    (categoryIds !== undefined
      ? !validCategoryIds(categoryIds)
      : categoryId !== undefined &&
        categoryId !== null &&
        (typeof categoryId !== "string" || !uuid.test(categoryId))) ||
    (coverPhotoId !== null &&
      (typeof coverPhotoId !== "string" || !uuid.test(coverPhotoId)))
  )
    throw new RequestError(
      400,
      "Choose a valid date, category and ready cover photo.",
    );
  return database().begin(async (sql) => {
    const [locked] = await sql<
      Pick<GardenPage, "category_ids" | "category_id">[]
    >`select category_id,category_ids from pages where id=${id} and metadata_version=${Number(metadataVersion)} and deleted_at is null for update`;
    if (!locked)
      throw new RequestError(
        409,
        "Page details changed elsewhere. Reload to see the saved details.",
      );
    const assignments = validCategoryIds(categoryIds)
      ? sortedCategoryIds(categoryIds)
      : categoryId === undefined || categoryId === locked.category_id
        ? pageCategoryIds(locked)
        : typeof categoryId === "string"
          ? [categoryId.toLowerCase()]
          : [];
    for (const photoId of [coverPhotoId, sharingCoverPhotoId]) {
      if (
        photoId &&
        !(
          await sql`select id from media_photos where id=${String(photoId)} and status='ready' for share`
        ).length
      )
        throw new RequestError(
          400,
          "Choose a ready photo from the shared library.",
        );
    }
    const rows = await sql<
      GardenPage[]
    >`update pages set page_date=${date as string | null},category_ids=${sql.array(assignments, 2950)}::uuid[],cover_photo_id=${coverPhotoId as string | null},sharing_title=case when ${sharingTitle !== undefined} then ${typeof sharingTitle === "string" ? sharingTitle || null : null} else sharing_title end,sharing_description=case when ${sharingDescription !== undefined} then ${typeof sharingDescription === "string" ? sharingDescription || null : null} else sharing_description end,sharing_cover_photo_id=case when ${sharingCoverPhotoId !== undefined} then ${(sharingCoverPhotoId as string | null) ?? null}::uuid else sharing_cover_photo_id end,allow_indexing=case when ${allowIndexing !== undefined} then ${allowIndexing ?? true}::boolean else allow_indexing end,metadata_version=metadata_version+1,version=version+1,edit_group_id=case when updated_by=${admin.id} and edit_reason='details' and updated_at>now()-interval '1 minute' then edit_group_id else gen_random_uuid() end,editor_session_id=null,edit_reason='details',updated_at=now(),updated_by=${admin.id} where id=${id} and metadata_version=${Number(metadataVersion)} and deleted_at is null returning *`;
    if (!rows[0])
      throw new RequestError(
        409,
        "Page details changed elsewhere. Reload to see the saved details.",
      );
    return JSON.parse(JSON.stringify(rows[0]));
  });
}
export async function publicGardenPages(): Promise<PageCard[]> {
  return database()<PageCard[]>`
    select p.id, p.title, p.slug, to_char(p.page_date, 'YYYY-MM-DD') as page_date,
      p.cover_photo_id, p.visibility
    from pages p
    where p.visibility = 'public' and p.deleted_at is null
      and not exists (select 1 from garden_settings where homepage_id = p.id)
    order by p.page_date desc nulls last, p.created_at desc, p.id
  `;
}

export async function gridPages(
  selection: GridSelection,
  admin: Administrator | null,
): Promise<PageCard[]> {
  const sql = database();
  if (selection.mode === "manual" && !selection.pageIds.length) return [];
  if (selection.mode === "category" && !selection.categoryId) return [];
  const rows =
    selection.mode === "manual"
      ? await sql<
          PageCard[]
        >`select id,title,slug,to_char(page_date,'YYYY-MM-DD') as page_date,cover_photo_id,visibility from pages where id in ${sql(selection.pageIds)} and deleted_at is null and (${Boolean(admin)} or visibility='public')`
      : await sql<PageCard[]>`with recursive tree as (
          select id from page_categories where id=${selection.categoryId}
          union
          select c.id from page_categories c join tree on c.parent_id=tree.id
        ) select id,title,slug,to_char(page_date,'YYYY-MM-DD') as page_date,cover_photo_id,visibility from pages
        where category_ids && array(select id from tree) and deleted_at is null and (${Boolean(admin)} or visibility='public')
        order by page_date desc nulls last,created_at desc,id`;
  return selection.mode === "manual"
    ? selection.pageIds.flatMap((id) => rows.filter((p) => p.id === id))
    : rows;
}
