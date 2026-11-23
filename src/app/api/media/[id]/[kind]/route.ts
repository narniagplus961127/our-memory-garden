import { photoThumbnailKind, photoVariantWidths } from "@/lib/media";
import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { photoResponse } from "@/lib/server/media";
import { observeOriginResponse } from "@/lib/server/usage";
import { limitRequest } from "@/lib/server/request-rate-limit";
export const dynamic = "force-dynamic";
async function serve(
  request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  let metricKind: "thumbnail" | "display" | "original" | "other" = "other";
  const limited = limitRequest(request, "media-read", 1200);
  if (limited) return limited;
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
    const response = await photoResponse(
      id,
      imageKind,
      () => currentAdministrator(request.headers),
      request.headers.get("If-None-Match"),
      request.method === "HEAD",
    );
    return request.method === "HEAD"
      ? response
      : observeOriginResponse(response, metricKind);
  } catch (error) {
    const response = errorResponse(error);
    return request.method === "HEAD"
      ? new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      : observeOriginResponse(response, metricKind);
  }
}
export const GET = serve;
export const HEAD = serve;
