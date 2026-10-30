import "server-only";
import { database } from "./db";
import { RequestError } from "./http";
import type { Administrator } from "./pages";
import type { GardenPage } from "../pages";
import {
  uuid,
  type Category,
  type GridSelection,
  type PageCard,
} from "../organization";
export async function categories(): Promise<Category[]> {
  return database()<
    Category[]
  >`select id,name from page_categories order by lower(name),id`;
}
export async function editCategory(
  admin: Administrator,
  name: unknown,
  id?: string,
  expectedName?: unknown,
) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
    throw new RequestError(
      400,
      "Enter a category name between 1 and 100 characters.",
    );
  if (id && !uuid.test(id)) throw new RequestError(404, "Category not found.");
  try {
    const rows = id
      ? await database()<
          Category[]
        >`update page_categories set name=${name.trim()} where id=${id} and name=${String(expectedName)} returning id,name`
      : await database()<
          Category[]
        >`insert into page_categories(name,created_by) values(${name.trim()},${admin.id}) returning id,name`;
    if (!rows[0])
      throw new RequestError(
        409,
        "This category changed elsewhere. Reload before renaming.",
      );
    return rows[0];
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      throw new RequestError(400, "A category already uses this name.");
    throw e;
  }
}
export async function updateDetails(
  admin: Administrator,
  id: string,
  body: Record<string, unknown>,
) {
  if (!uuid.test(id)) throw new RequestError(404, "Page not found.");
  const { date, categoryId, coverPhotoId, metadataVersion } = body;
  if (
    !Number.isSafeInteger(metadataVersion) ||
    Number(metadataVersion) < 0 ||
    (date !== null &&
      (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)) ||
    [categoryId, coverPhotoId].some(
      (v) => v !== null && (typeof v !== "string" || !uuid.test(v)),
    )
  )
    throw new RequestError(
      400,
      "Choose a valid date, category and ready cover photo.",
    );
  return database().begin(async (sql) => {
    if (
      categoryId &&
      !(
        await sql`select id from page_categories where id=${String(categoryId)}`
      ).length
    )
      throw new RequestError(400, "Choose an existing category.");
    if (
      coverPhotoId &&
      !(
        await sql`select id from media_photos where id=${String(coverPhotoId)} and status='ready' for update`
      ).length
    )
      throw new RequestError(
        400,
        "Choose a ready photo from the shared library.",
      );
    const rows = await sql<
      GardenPage[]
    >`update pages set page_date=${date as string | null},category_id=${categoryId as string | null},cover_photo_id=${coverPhotoId as string | null},metadata_version=metadata_version+1,version=version+1,updated_at=now(),updated_by=${admin.id} where id=${id} and metadata_version=${Number(metadataVersion)} and deleted_at is null returning *`;
    if (!rows[0])
      throw new RequestError(
        409,
        "Page details changed elsewhere. Reload to see the saved details.",
      );
    return JSON.parse(JSON.stringify(rows[0]));
  });
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
      : await sql<
          PageCard[]
        >`select id,title,slug,to_char(page_date,'YYYY-MM-DD') as page_date,cover_photo_id,visibility from pages where category_id=${selection.categoryId} and deleted_at is null and (${Boolean(admin)} or visibility='public') order by page_date desc nulls last,created_at desc,id`;
  return selection.mode === "manual"
    ? selection.pageIds.flatMap((id) => rows.filter((p) => p.id === id))
    : rows;
}
