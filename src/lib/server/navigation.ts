import "server-only";
import { database } from "./db";
import type { Administrator } from "./pages";
import { RequestError } from "./http";
import {
  validDestination,
  type MenuItem,
  type PublicMenuItem,
} from "../destinations";
export async function readNavigation() {
  const rows = await database()<
    { items: MenuItem[]; version: number }[]
  >`select items,version from garden_navigation where singleton=true`;
  return rows[0];
}
export async function publicNavigation(): Promise<PublicMenuItem[]> {
  const { items } = await readNavigation();
  const pages = await database()<
    { id: string; slug: string }[]
  >`select id,slug from pages where visibility='public' and deleted_at is null`;
  const addresses = new Map(pages.map((p) => [p.id, p.slug]));
  const visible = new Map(
    items.map((i) => [
      i.id,
      i.destination.kind === "external" || addresses.has(i.destination.pageId),
    ]),
  );
  function allowed(item: MenuItem): boolean {
    return (
      Boolean(visible.get(item.id)) &&
      (!item.parentId || allowed(items.find((p) => p.id === item.parentId)!))
    );
  }
  return items.filter(allowed).map((i) => ({
    id: i.id,
    label: i.label,
    parentId: i.parentId,
    href:
      i.destination.kind === "page"
        ? "/garden/" + addresses.get(i.destination.pageId)
        : i.destination.url,
  }));
}
export async function saveNavigation(
  value: unknown,
  version: unknown,
  admin: Administrator,
) {
  if (
    !Number.isSafeInteger(version) ||
    !Array.isArray(value) ||
    value.length > 100
  )
    throw new RequestError(400, "Invalid navigation.");
  const ids = new Set<string>();
  for (const i of value) {
    if (
      !i ||
      typeof i !== "object" ||
      Object.keys(i).some(
        (k) => !["id", "label", "parentId", "destination"].includes(k),
      ) ||
      typeof i.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(i.id) ||
      ids.has(i.id) ||
      typeof i.label !== "string" ||
      !i.label.trim() ||
      i.label.length > 100 ||
      !(i.parentId === null || typeof i.parentId === "string") ||
      !validDestination(i.destination)
    )
      throw new RequestError(
        400,
        "Give each menu item a label and a valid garden page or complete web address.",
      );
    ids.add(i.id);
  }
  const items = value as MenuItem[];
  const previous = await readNavigation();
  const pages = await database()<
    { id: string }[]
  >`select id from pages where deleted_at is null`;
  for (const item of items) {
    const destination = item.destination;
    if (
      destination.kind === "page" &&
      !pages.some((p) => p.id === destination.pageId) &&
      !previous.items.some(
        (i) =>
          i.id === item.id &&
          i.destination.kind === "page" &&
          i.destination.pageId === destination.pageId,
      )
    )
      throw new RequestError(400, "Choose an available garden page.");
    const seen = new Set([item.id]);
    let parent = item.parentId;
    while (parent) {
      if (seen.has(parent) || !ids.has(parent))
        throw new RequestError(
          400,
          "A menu item cannot be its own parent or a descendant's child.",
        );
      seen.add(parent);
      parent = items.find((i) => i.id === parent)!.parentId;
    }
  }
  const rows = await database()<
    { items: MenuItem[]; version: number }[]
  >`update garden_navigation set items=${database().json(items)},version=version+1 where singleton=true and version=${Number(version)} returning items,version`;
  if (!rows[0])
    throw new RequestError(
      409,
      "Navigation changed elsewhere. Reload to see the saved menu; your changes are still here.",
    );
  return rows[0];
}
