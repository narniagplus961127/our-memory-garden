import { currentAdministrator } from "@/lib/server/auth";
import { pageHistory } from "@/lib/server/page-recovery";
import { RequestError, errorResponse } from "@/lib/server/http";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view history.");
    return Response.json(await pageHistory((await params).id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
