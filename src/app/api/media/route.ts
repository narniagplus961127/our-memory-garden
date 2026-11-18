import { currentAdministrator } from "@/lib/server/auth";
import {
  listGridPickerPhotos,
  listPhotoLibraryPage,
  listPhotos,
} from "@/lib/server/media";
import { errorResponse, RequestError } from "@/lib/server/http";
import { photoGridBatchSize } from "@/lib/photo-grid";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view the media library.");
    const query = new URL(request.url).searchParams;
    const search = (query.get("search") ?? "").trim();
    if (search.length > 200)
      throw new RequestError(400, "Invalid photo search.");
    if (query.get("view") === "grid-picker") {
      const offset = Number(query.get("offset") ?? "0");
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 2147483647)
        throw new RequestError(400, "Invalid photo search.");
      const photos = await listGridPickerPhotos(
        search,
        offset,
        photoGridBatchSize + 1,
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
        ? await listPhotoLibraryPage(search, query.get("after"))
        : await listPhotos();
    return Response.json(photos, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
