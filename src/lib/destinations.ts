export type Destination =
  | { kind: "page"; pageId: string }
  | { kind: "category"; categoryId: string }
  | { kind: "external"; url: string };
export type MenuItem = {
  id: string;
  label: string;
  parentId: string | null;
  destination: Destination;
};
export type PublicMenuItem = {
  id: string;
  label: string;
  parentId: string | null;
  href: string;
};
export function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function validDestination(value: unknown): value is Destination {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const d = value as Record<string, unknown>;
  return d.kind === "page" || d.kind === "category"
    ? Object.keys(d).length === 2 &&
        typeof (d.kind === "page" ? d.pageId : d.categoryId) === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          String(d.kind === "page" ? d.pageId : d.categoryId),
        )
    : d.kind === "external" && Object.keys(d).length === 2 && isWebUrl(d.url);
}
// Empty optional block destinations keep their selected mode without becoming links.
export function unconfiguredDestination(value: unknown): value is Destination {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const d = value as Record<string, unknown>;
  return (
    Object.keys(d).length === 2 &&
    ((d.kind === "page" && d.pageId === "") ||
      (d.kind === "category" && d.categoryId === "") ||
      (d.kind === "external" && d.url === ""))
  );
}
export function destinationHref(
  destination?: Destination | null,
  legacy?: string,
) {
  if (destination === null) return undefined;
  if (destination) {
    if (!validDestination(destination)) return undefined;
    return destination.kind === "page"
      ? "/p/" + destination.pageId
      : destination.kind === "category"
        ? "/c/" + destination.categoryId
        : destination.url;
  }
  return isWebUrl(legacy) ? legacy : undefined;
}
