import { currentAdministrator } from "@/lib/server/auth";
import { listPhotos } from "@/lib/server/media";
import { errorResponse, RequestError } from "@/lib/server/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view the media library.");
    return Response.json(await listPhotos(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
