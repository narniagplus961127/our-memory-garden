import { currentAdministrator } from "@/lib/server/auth";
import { historicalPage, restoreVersion } from "@/lib/server/page-recovery";
import {
  RequestError,
  errorResponse,
  assertSameOrigin,
  bodyJson,
} from "@/lib/server/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; version: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view history.");
    const p = await params;
    return Response.json(await historicalPage(p.id, Number(p.version)), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to restore history.");
    const body = await bodyJson(request);
    if (body.confirm !== true)
      throw new RequestError(400, "Confirm restoring this version.");
    const p = await params;
    return Response.json(
      await restoreVersion(p.id, Number(p.version), body.version, admin),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
