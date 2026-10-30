import { currentAdministrator } from "@/lib/server/auth";
import { editCategory } from "@/lib/server/organization";
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
    if (!admin) throw new RequestError(401, "Sign in to organize pages.");
    const body = await bodyJson(request);
    return Response.json(
      await editCategory(
        admin,
        body.name,
        (await params).id,
        body.expectedName,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
