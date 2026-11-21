import "server-only";
import type { AdminList, AdminListOrder } from "../admin-list-order";
import { mergeVisibleOrder } from "../admin-list-order";
import { uuid } from "../organization";
import { database } from "./db";
import { RequestError } from "./http";
import type postgres from "postgres";

type OrderSql = ReturnType<typeof database> | postgres.TransactionSql;

export async function savePartialPageOrder(ids: unknown, version: unknown) {
  if (
    !Number.isSafeInteger(version) ||
    !Array.isArray(ids) ||
    !ids.every(
      (id) =>
        typeof id === "string" && uuid.test(id) && id === id.toLowerCase(),
    ) ||
    new Set(ids).size !== ids.length
  )
    throw new RequestError(400, "Invalid list order.");
  return database().begin(async (sql) => {
    const [order] = await sql<
      AdminListOrder[]
    >`select ids,version from garden_admin_list_order where list='pages' and version=${Number(version)} for update`;
    if (!order)
      throw new RequestError(
        409,
        "This list was reordered elsewhere. Reload to see the saved order.",
      );
    const pages = await sql<
      { id: string }[]
    >`select id from pages where deleted_at is null order by array_position(${sql.array(order.ids, 2950)}::uuid[],id) asc nulls last,updated_at desc,id`;
    const complete = pages.map((page) => page.id),
      existing = new Set(complete);
    if (ids.some((id) => !existing.has(id)))
      throw new RequestError(
        409,
        "Pages changed elsewhere. Reload to see the current list.",
      );
    return saveAdminListOrder(
      "pages",
      mergeVisibleOrder(complete, ids, ids),
      version,
      sql,
    );
  });
}

export async function readAdminListOrder(
  list: AdminList,
  sql: OrderSql = database(),
) {
  const [order] = await sql<AdminListOrder[]>`
    select ids, version from garden_admin_list_order where list = ${list}
  `;
  return order;
}

export async function saveAdminListOrder(
  list: AdminList,
  ids: unknown,
  version: unknown,
  sql: OrderSql = database(),
) {
  if (
    !Number.isSafeInteger(version) ||
    !Array.isArray(ids) ||
    !ids.every(
      (id) =>
        typeof id === "string" && uuid.test(id) && id === id.toLowerCase(),
    ) ||
    new Set(ids).size !== ids.length
  )
    throw new RequestError(400, "Invalid list order.");

  const [order] = await sql<AdminListOrder[]>`
    update garden_admin_list_order
    set ids = ${sql.array(ids, 2950)}::uuid[], version = version + 1
    where list = ${list} and version = ${Number(version)}
    returning ids, version
  `;
  if (!order)
    throw new RequestError(
      409,
      "This list was reordered elsewhere. Reload to see the saved order.",
    );
  return order;
}
