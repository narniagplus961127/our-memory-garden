import "server-only";
import type { AdminList, AdminListOrder } from "../admin-list-order";
import { uuid } from "../organization";
import { database } from "./db";
import { RequestError } from "./http";

export async function readAdminListOrder(list: AdminList) {
  const [order] = await database()<AdminListOrder[]>`
    select ids, version from garden_admin_list_order where list = ${list}
  `;
  return order;
}

export async function saveAdminListOrder(
  list: AdminList,
  ids: unknown,
  version: unknown,
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

  const sql = database();
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
