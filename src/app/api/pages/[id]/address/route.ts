import { currentAdministrator } from "@/lib/server/auth";
import { changeAddress } from "@/lib/server/addresses";
import { getVisiblePage } from "@/lib/server/pages";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin)
      throw new RequestError(401, "Sign in to change page addresses.");
    const { id } = await params;
    if (!(await getVisiblePage(id, admin)))
      throw new RequestError(404, "Page not found.");
    const body = await bodyJson(request);
    const page = await changeAddress(id, body.slug, body.expectedSlug, admin);
    return Response.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
