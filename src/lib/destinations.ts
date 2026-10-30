export type Destination =
  { kind: "page"; pageId: string } | { kind: "external"; url: string };
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
  return d.kind === "page"
    ? Object.keys(d).length === 2 &&
        typeof d.pageId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          d.pageId,
        )
    : d.kind === "external" && Object.keys(d).length === 2 && isWebUrl(d.url);
}
export function destinationHref(destination?: Destination, legacy?: string) {
  return destination?.kind === "page"
    ? "/p/" + destination.pageId
    : destination?.kind === "external" && isWebUrl(destination.url)
      ? destination.url
      : isWebUrl(legacy)
        ? legacy
        : undefined;
}
