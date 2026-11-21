import { currentAdministrator } from "@/lib/server/auth";
import {
  listGridPickerPhotos,
  listPhotoLibraryPage,
  listPhotos,
  mediaPageOptions,
} from "@/lib/server/media";
import { errorResponse, RequestError } from "@/lib/server/http";
import { photoGridBatchSize } from "@/lib/photo-grid";
import {
  emptyMediaFilters,
  validMediaFilters,
  type MediaFilters,
} from "@/lib/media-filters";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view the media library.");
    const query = new URL(request.url).searchParams;
    const search = (query.get("search") ?? "").trim();
    if (search.length > 200)
      throw new RequestError(400, "Invalid photo search.");
    if (query.get("view") === "events")
      return Response.json(await mediaPageOptions(search), {
        headers: { "Cache-Control": "private, no-store" },
      });
    const filters = Object.fromEntries(
      Object.entries(emptyMediaFilters).map(([key, fallback]) => [
        key,
        query.get(key) ?? fallback,
      ]),
    ) as MediaFilters;
    if (!validMediaFilters(filters))
      throw new RequestError(
        400,
        "Choose a valid photo filter and date range.",
      );
    if (query.get("view") === "grid-picker") {
      const offset = Number(query.get("offset") ?? "0");
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 2147483647)
        throw new RequestError(400, "Invalid photo search.");
      const photos = await listGridPickerPhotos(
        search,
        offset,
        photoGridBatchSize + 1,
        filters,
      );
      return Response.json(
        {
          photos: photos.slice(0, photoGridBatchSize),
          more: photos.length > photoGridBatchSize,
        },
        {
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    // Older editor tabs can still use the original response while a release rolls out.
    const photos =
      query.get("view") === "library"
        ? await listPhotoLibraryPage(search, query.get("after"), filters)
        : await listPhotos();
    return Response.json(photos, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
