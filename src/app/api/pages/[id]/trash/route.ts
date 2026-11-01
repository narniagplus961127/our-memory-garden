import { currentAdministrator } from "@/lib/server/auth";
import { changeTrash, inboundReferences } from "@/lib/server/page-recovery";
import {
  RequestError,
  errorResponse,
  assertSameOrigin,
  bodyJson,
} from "@/lib/server/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to manage trash.");
    return Response.json(await inboundReferences((await params).id), {
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
    if (!admin) throw new RequestError(401, "Sign in to manage trash.");
    const body = await bodyJson(request);
    if (
      body.confirm !== true ||
      !["trash", "restore", "delete"].includes(String(body.action))
    )
      throw new RequestError(400, "Confirm the page action.");
    return Response.json(
      await changeTrash(
        (await params).id,
        body.action as "trash" | "restore" | "delete",
        body.version,
        admin,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
