import "server-only";
import { database } from "./db";
import { RequestError } from "./http";
import type { Administrator } from "./pages";
import type { GardenPage } from "../pages";
export const validSlug = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
  value.length <= 100;
export async function changeAddress(
  id: string,
  slug: unknown,
  expectedSlug: unknown,
  _admin: Administrator,
) {
  if (!validSlug(slug) || typeof expectedSlug !== "string")
    throw new RequestError(
      400,
      "Use lowercase letters, numbers and single hyphens for the page address.",
    );
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw new RequestError(404, "Page not found.");
  try {
    const rows = await database()<
      GardenPage[]
    >`update pages set slug=${slug} where id=${id} and slug=${expectedSlug} and deleted_at is null returning *`;
    if (!rows[0])
      throw new RequestError(
        409,
        "The page address changed elsewhere. Reload before changing it again.",
      );
    return JSON.parse(JSON.stringify(rows[0]));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    )
      throw new RequestError(
        409,
        "This page address is already in use. Choose another.",
      );
    throw error;
  }
}
export async function getPageBySlug(slug: string, admin: Administrator | null) {
  if (!validSlug(slug)) return null;
  const rows = await database()<
    GardenPage[]
  >`select * from pages where slug=${slug} and deleted_at is null and (${Boolean(admin)} or visibility='public') limit 1`;
  return rows[0] ? (JSON.parse(JSON.stringify(rows[0])) as GardenPage) : null;
}
