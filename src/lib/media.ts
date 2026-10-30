export type PhotoUsage = {
  id: string;
  title: string;
  visibility: "public" | "private";
  deleted: boolean;
};
export type Photo = {
  id: string;
  name: string;
  width: number;
  height: number;
  original_bytes: number;
  display_bytes: number;
  publiclyAccessible: boolean;
  usages: PhotoUsage[];
};
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const displayPhotoUrl = (id: string) =>
  "/api/media/" + encodeURIComponent(id) + "/display";
