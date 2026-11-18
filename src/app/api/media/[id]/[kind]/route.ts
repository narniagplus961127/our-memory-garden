import { photoThumbnailKind, photoVariantWidths } from "@/lib/media";
import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { photoResponse } from "@/lib/server/media";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  try {
    const { id, kind } = await params;
    const imageKind =
      kind === "display" || kind === "original"
        ? kind
        : photoVariantWidths.find(
            (width) => kind === photoThumbnailKind(width),
          );
    if (imageKind === undefined)
      throw new RequestError(404, "Photo not found.");
    return await photoResponse(
      id,
      imageKind,
      await currentAdministrator(request.headers),
      request.headers.get("If-None-Match"),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
