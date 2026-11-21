import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { exportDownload } from "@/lib/server/exports";
import { observeOriginResponse } from "@/lib/server/usage";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
type Context = { params: Promise<{ id: string; partId: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to download the backup.");
    const { id, partId } = await params;
    return observeOriginResponse(
      await exportDownload(id, partId, request.headers.get("range")),
      "backup",
    );
  } catch (error) {
    return observeOriginResponse(errorResponse(error), "backup");
  }
}
export async function HEAD(request: Request, { params }: Context) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to download the backup.");
    const { id, partId } = await params;
    const response = await exportDownload(id, partId, "bytes=0-0");
    await response.body?.cancel();
    return new Response(null, { status: 200, headers: response.headers });
  } catch (error) {
    return errorResponse(error);
  }
}
