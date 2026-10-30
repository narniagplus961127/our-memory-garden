import { currentAdministrator } from "@/lib/server/auth";
import { listTrash } from "@/lib/server/page-recovery";
import { RequestError, errorResponse } from "@/lib/server/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view trash.");
    return Response.json(await listTrash(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
