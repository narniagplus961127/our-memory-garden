import "server-only";
import { database } from "./db";
import { RequestError } from "./http";
import type { Administrator } from "./pages";
import { uuid, type Category } from "../organization";
import { addressFromTitle, validSlug } from "../page-address";
import { cloneName, cloneSlug } from "./clone-name";
import type postgres from "postgres";
import { readAdminListOrder, saveAdminListOrder } from "./admin-list-order";

// Serialize changes to the tree so concurrent moves cannot create a cycle.
async function lockCategories(sql: postgres.TransactionSql) {
  await sql`select pg_advisory_xact_lock(hashtext('garden:category-tree'))`;
}

type CategorySql = ReturnType<typeof database> | postgres.TransactionSql;

export async function categories(
  sql: CategorySql = database(),
): Promise<Category[]> {
  return sql<
    Category[]
  >`select id,name,slug,parent_id from page_categories order by lower(name),id`;
}

async function categoryTree(sql: postgres.TransactionSql) {
  const [items, order] = await Promise.all([
    categories(sql),
    readAdminListOrder("categories", sql),
  ]);
  return { items, order };
}

export async function readCategoryTree() {
  return database().begin(
    "isolation level repeatable read read only",
    categoryTree,
  );
}

async function categoryTreeChanged(
  sql: postgres.TransactionSql,
  deletedId: string | null = null,
) {
  await sql`update garden_admin_list_order
    set ids=case when ${deletedId}::uuid is null then ids else array_remove(ids,${deletedId}::uuid) end,
        version=version+1 where list='categories'`;
}

async function validateCategoryParent(
  sql: postgres.TransactionSql,
  id: string,
  parentId: string,
) {
  const ancestors = await sql<{ id: string }[]>`
    with recursive tree as (
      select id,parent_id from page_categories where id=${parentId}
      union
      select c.id,c.parent_id from page_categories c join tree on c.id=tree.parent_id
    ) select id from tree
  `;
  if (!ancestors.length)
    throw new RequestError(400, "Choose an existing parent category.");
  if (ancestors.some((ancestor) => ancestor.id === id.toLowerCase()))
    throw new RequestError(
      400,
      "Choose a parent outside this category and its subcategories.",
    );
}

export async function saveCategoryTree(
  ids: unknown,
  version: unknown,
  move: unknown,
) {
  return database().begin(async (sql) => {
    await lockCategories(sql);
    const order = await saveAdminListOrder("categories", ids, version, sql);
    const list = await categories(sql);
    const byId = new Map(list.map((item) => [item.id, item]));
    if (
      order.ids.length !== list.length ||
      order.ids.some((id) => !byId.has(id))
    )
      throw new RequestError(
        409,
        "Categories changed elsewhere. Reload to see the saved order.",
      );
    if (move === undefined) return order;
    if (!move || typeof move !== "object" || Array.isArray(move))
      throw new RequestError(400, "Invalid category move.");
    const { id, parentId, expectedParentId } = move as Record<string, unknown>;
    const isParent = (value: unknown): value is string | null =>
      value === null || (typeof value === "string" && uuid.test(value));
    if (
      typeof id !== "string" ||
      !byId.has(id) ||
      !isParent(parentId) ||
      !isParent(expectedParentId)
    )
      throw new RequestError(400, "Invalid category move.");
    if (byId.get(id)?.parent_id !== expectedParentId)
      throw new RequestError(
        409,
        "This category was moved elsewhere. Reload to see the saved order.",
      );
    if (parentId) await validateCategoryParent(sql, id, parentId);
    await sql`update page_categories set parent_id=${parentId} where id=${id}`;
    return order;
  });
}
export async function categoryById(
  id: string,
  sql: ReturnType<typeof database> | postgres.TransactionSql = database(),
) {
  if (!uuid.test(id)) return null;
  const [category] = await sql<
    Category[]
  >`select id,name,slug,parent_id from page_categories where id=${id}`;
  return category ?? null;
}
export async function categoryBySlug(slug: string) {
  if (!validSlug(slug)) return null;
  const [category] = await database()<
    Category[]
  >`select id,name,slug,parent_id from page_categories where slug=${slug}`;
  return category ?? null;
}
export async function cloneCategory(
  admin: Administrator,
  sourceId: string,
  id: string,
) {
  return database().begin(async (sql) => {
    await lockCategories(sql);
    if (await categoryById(id, sql)) return { id };
    const source = await categoryById(sourceId, sql);
    if (!source) throw new RequestError(404, "Category not found.");
    for (let copy = 1; copy <= 100; copy++) {
      const [inserted] = await sql<{ id: string }[]>`
        insert into page_categories(id, name, slug, created_by, parent_id)
        values (${id}, ${cloneName(source.name, 100, copy)}, ${cloneSlug(source.slug, copy)}, ${admin.id}, ${source.parent_id})
        on conflict do nothing returning id
      `;
      if (inserted) {
        await categoryTreeChanged(sql);
        return inserted;
      }
    }
    throw new RequestError(
      409,
      "Could not find an unused name and URL for this copy.",
    );
  });
}
export async function editCategory(
  admin: Administrator,
  name: unknown,
  id?: string,
  expectedName?: unknown,
  address: {
    slug?: unknown;
    expectedSlug?: unknown;
    createId?: unknown;
    parentId?: unknown;
    expectedParentId?: unknown;
  } = {},
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
  try {
    return await database().begin(async (sql) => {
      await lockCategories(sql);
      const current = await categoryById(id ?? String(createId), sql);
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
      const parent =
        address.parentId === undefined
          ? (current?.parent_id ?? null)
          : address.parentId;
      if (parent !== null && (typeof parent !== "string" || !uuid.test(parent)))
        throw new RequestError(400, "Choose an existing parent category.");
      const parentId = parent?.toLowerCase() ?? null;
      if (
        current &&
        current.name === name.trim() &&
        current.slug === slug &&
        current.parent_id === parentId
      )
        return current;
      if (!id && current)
        throw new RequestError(
          409,
          "This category request was already used. Reopen Create category.",
        );
      if (
        id &&
        current &&
        (current.name !== expectedName ||
          (address.slug !== undefined &&
            current.slug !== address.expectedSlug) ||
          (address.parentId !== undefined &&
            current.parent_id !== address.expectedParentId))
      )
        throw new RequestError(
          409,
          "This category changed elsewhere. Review the saved category before updating.",
        );
      if (parentId)
        await validateCategoryParent(sql, id ?? String(createId), parentId);
      const [saved] = id
        ? await sql<Category[]>`
        update page_categories set name=${name.trim()},slug=${slug},parent_id=${parentId}
        where id=${id} returning id,name,slug,parent_id
      `
        : await sql<Category[]>`
        insert into page_categories(id,name,slug,created_by,parent_id)
        values(${String(createId)},${name.trim()},${slug},${admin.id},${parentId}) returning id,name,slug,parent_id
      `;
      if (
        !current ||
        current.parent_id !== parentId ||
        current.name !== saved.name
      )
        await categoryTreeChanged(sql);
      return saved;
    });
  } catch (error) {
    const failure = error as { code?: string; constraint_name?: string };
    if (failure.code === "23505") {
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
      await lockCategories(sql);
      const [category] = await sql<
        Category[]
      >`select id,name,slug,parent_id from page_categories where id=${id} for update`;
      if (!category) return { deleted: true, ...(await categoryTree(sql)) };
      if (
        category.name !== body.expectedName ||
        category.slug !== body.expectedSlug ||
        (body.expectedParentId !== undefined &&
          category.parent_id !== body.expectedParentId)
      )
        throw new RequestError(
          409,
          "This category changed elsewhere. Review the saved category before deleting.",
        );
      await sql`update pages set category_ids=array_remove(category_ids,${id}::uuid),metadata_version=metadata_version+1,version=version+1,updated_at=now(),updated_by=${admin.id},edit_reason='details',edit_group_id=gen_random_uuid(),editor_session_id=null where category_ids @> array[${id}::uuid]`;
      await sql`update page_categories set parent_id=${category.parent_id} where parent_id=${id}`;
      await sql`delete from page_categories where id=${id}`;
      await categoryTreeChanged(sql, id);
      return { deleted: true, ...(await categoryTree(sql)) };
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
