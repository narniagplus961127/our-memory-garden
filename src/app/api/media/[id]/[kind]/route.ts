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
    if (kind !== "display" && kind !== "original")
      throw new RequestError(404, "Photo not found.");
    return await photoResponse(
      id,
      kind,
      await currentAdministrator(request.headers),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
