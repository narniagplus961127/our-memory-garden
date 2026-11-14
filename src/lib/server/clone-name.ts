import { addressFromTitle } from "../page-address";

export function cloneName(name: string, limit: number, copy = 1) {
  const suffix = copy === 1 ? " (copy)" : ` (copy ${copy})`;
  return (
    [...name]
      .slice(0, limit - suffix.length)
      .join("")
      .trimEnd() + suffix
  );
}

export function cloneSlug(slug: string, copy: number) {
  const suffix = copy === 1 ? "-copy" : `-copy-${copy}`;
  return (
    addressFromTitle(slug)
      .slice(0, 100 - suffix.length)
      .replace(/-+$/, "") + suffix
  );
}
