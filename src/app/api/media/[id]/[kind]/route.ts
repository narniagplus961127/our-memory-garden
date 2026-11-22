import { photoThumbnailKind, photoVariantWidths } from "@/lib/media";
import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { photoResponse } from "@/lib/server/media";
import { observeOriginResponse } from "@/lib/server/usage";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  let metricKind: "thumbnail" | "display" | "original" | "other" = "other";
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
    metricKind = typeof imageKind === "number" ? "thumbnail" : imageKind;
    return observeOriginResponse(
      await photoResponse(
        id,
        imageKind,
        () => currentAdministrator(request.headers),
        request.headers.get("If-None-Match"),
      ),
      metricKind,
    );
  } catch (error) {
    return observeOriginResponse(errorResponse(error), metricKind);
  }
}
