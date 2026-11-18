export type PhotoUsage = {
  id: string;
  title: string;
  visibility: "public" | "private";
  deleted: boolean;
  history?: boolean;
};
export type Photo = {
  id: string;
  name: string;
  deletionPending?: boolean;
  deletionError?: string;
  width: number;
  height: number;
  original_bytes: number;
  display_bytes: number;
  publiclyAccessible: boolean;
  usages: PhotoUsage[];
};
export type PhotoListItem = Pick<
  Photo,
  "id" | "name" | "width" | "publiclyAccessible"
> & {
  deletionPending: boolean;
  usageCount: number;
};
export type PhotoLibraryPage = {
  photos: PhotoListItem[];
  nextCursor: string | null;
};
export const photoLibraryPageSize = 24;

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const displayPhotoUrl = (id: string) =>
  "/api/media/" + encodeURIComponent(id) + "/display";

export const photoVariantWidths = [320, 640, 1280] as const;
export type PhotoVariantWidth = (typeof photoVariantWidths)[number];

export const photoThumbnailKind = (width: PhotoVariantWidth) =>
  "thumb-" + width;
export const thumbnailPhotoUrl = (id: string, width: PhotoVariantWidth = 320) =>
  "/api/media/" + encodeURIComponent(id) + "/" + photoThumbnailKind(width);

export function responsivePhotoSources(
  id: string,
  sizes: string,
  intrinsicWidth?: number,
  maxWidth: PhotoVariantWidth = 1280,
) {
  const widths = photoVariantWidths.filter((width) => width <= maxWidth);
  const candidates =
    intrinsicWidth && intrinsicWidth < maxWidth
      ? widths.filter((width) => width < intrinsicWidth)
      : widths;
  const sources = candidates.map(
    (width) => thumbnailPhotoUrl(id, width) + " " + width + "w",
  );
  if (intrinsicWidth && intrinsicWidth < maxWidth) {
    const largest = widths.find((width) => width >= intrinsicWidth) ?? maxWidth;
    sources.push(thumbnailPhotoUrl(id, largest) + " " + intrinsicWidth + "w");
  }
  return {
    src: thumbnailPhotoUrl(id, maxWidth > 320 ? 640 : 320),
    srcSet: sources.join(", "),
    sizes: "auto, " + sizes,
  };
}
