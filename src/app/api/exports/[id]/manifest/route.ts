import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { exportManifest } from "@/lib/server/exports";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to download the manifest.");
    return await exportManifest((await params).id);
  } catch (error) {
    return errorResponse(error);
  }
}
