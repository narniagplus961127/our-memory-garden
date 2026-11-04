import "server-only";
import { database } from "./db";
import { RequestError } from "./http";
import type { Administrator } from "./pages";
import { uuid, type Category } from "../organization";
import { addressFromTitle, validSlug } from "../page-address";

export async function categories(): Promise<Category[]> {
  return database()<
    Category[]
  >`select id,name,slug from page_categories order by lower(name),id`;
}
export async function categoryById(id: string) {
  if (!uuid.test(id)) return null;
  const [category] = await database()<
    Category[]
  >`select id,name,slug from page_categories where id=${id}`;
  return category ?? null;
}
export async function categoryBySlug(slug: string) {
  if (!validSlug(slug)) return null;
  const [category] = await database()<
    Category[]
  >`select id,name,slug from page_categories where slug=${slug}`;
  return category ?? null;
}
export async function editCategory(
  admin: Administrator,
  name: unknown,
  id?: string,
  expectedName?: unknown,
  address: { slug?: unknown; expectedSlug?: unknown; createId?: unknown } = {},
) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
    throw new RequestError(
      400,
      "Enter a category name between 1 and 100 characters.",
    );
  if (id && !uuid.test(id)) throw new RequestError(404, "Category not found.");
  const createId = address.createId ?? crypto.randomUUID();
  if (!id && (typeof createId !== "string" || !uuid.test(createId)))
    throw new RequestError(400, "Invalid category request.");
  const current = id
    ? await categoryById(id)
    : await categoryById(String(createId));
  if (id && !current) throw new RequestError(404, "Category not found.");
  const slug =
    address.slug ??
    current?.slug ??
    (addressFromTitle(name) || "category-" + String(createId).slice(0, 8));
  if (!validSlug(slug))
    throw new RequestError(
      400,
      "Use lowercase letters, numbers and single hyphens for the category address.",
    );
  if (current && current.name === name.trim() && current.slug === slug)
    return current;
  if (!id && current)
    throw new RequestError(
      409,
      "This category request was already used. Reopen Create category.",
    );
  if (
    id &&
    (current!.name !== expectedName ||
      (address.slug !== undefined && current!.slug !== address.expectedSlug))
  )
    throw new RequestError(
      409,
      "This category changed elsewhere. Review the saved category before updating.",
    );
  try {
    const rows = id
      ? await database()<
          Category[]
        >`update page_categories set name=${name.trim()},slug=${slug} where id=${id} and name=${current!.name} and slug=${current!.slug} returning id,name,slug`
      : await database()<
          Category[]
        >`insert into page_categories(id,name,slug,created_by) values(${String(createId)},${name.trim()},${slug},${admin.id}) returning id,name,slug`;
    if (!rows[0])
      throw new RequestError(
        409,
        "This category changed elsewhere. Review the saved category before updating.",
      );
    return rows[0];
  } catch (error) {
    const failure = error as { code?: string; constraint_name?: string };
    if (failure.code === "23505") {
      // A repeated create with the same request ID acknowledges a lost response.
      const existing = !id ? await categoryById(String(createId)) : null;
      if (existing?.name === name.trim() && existing.slug === slug)
        return existing;
      throw new RequestError(
        400,
        failure.constraint_name === "page_categories_slug_idx"
          ? "This category address is already in use. Choose another."
          : "A category already uses this name.",
      );
    }
    throw error;
  }
}
export async function deleteCategory(
  admin: Administrator,
  id: string,
  body: Record<string, unknown>,
) {
  if (!uuid.test(id)) throw new RequestError(404, "Category not found.");
  if (
    body.confirm !== true ||
    typeof body.expectedName !== "string" ||
    typeof body.expectedSlug !== "string"
  )
    throw new RequestError(400, "Review the category and confirm deletion.");
  try {
    return await database().begin(async (sql) => {
      const [category] = await sql<
        Category[]
      >`select id,name,slug from page_categories where id=${id} for update`;
      if (!category) return { deleted: true };
      if (
        category.name !== body.expectedName ||
        category.slug !== body.expectedSlug
      )
        throw new RequestError(
          409,
          "This category changed elsewhere. Review the saved category before deleting.",
        );
      await sql`update pages set category_id=null,metadata_version=metadata_version+1,version=version+1,updated_at=now(),updated_by=${admin.id},edit_reason='details',edit_group_id=gen_random_uuid(),editor_session_id=null where category_id=${id}`;
      await sql`delete from page_categories where id=${id}`;
      return { deleted: true };
    });
  } catch (error) {
    if (["23503", "40P01"].includes((error as { code?: string }).code ?? ""))
      throw new RequestError(
        409,
        "This category is being used in another edit. Review it and retry deletion.",
      );
    throw error;
  }
}
