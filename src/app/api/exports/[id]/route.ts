import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { getExport } from "@/lib/server/exports";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to manage exports.");
    const job = await getExport((await params).id);
    if (!job) throw new RequestError(404, "Export not found.");
    return Response.json(job, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
import { assertSameOrigin, bodyJson } from "@/lib/server/http";
import { cancelExport } from "@/lib/server/exports";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to cancel an export.");
    if ((await bodyJson(request)).confirm !== true)
      throw new RequestError(400, "Confirm cancellation first.");
    return Response.json(await cancelExport((await params).id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
