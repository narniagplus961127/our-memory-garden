import { currentAdministrator } from "@/lib/server/auth";
import {
  deletePageTemplate,
  savePageTemplate,
} from "@/lib/server/page-templates";
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
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to manage templates.");
    return Response.json(
      await savePageTemplate((await params).id, await bodyJson(request)),
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to manage templates.");
    const body = await bodyJson(request);
    if (body.confirm !== true)
      throw new RequestError(400, "Confirm template deletion first.");
    await deletePageTemplate((await params).id, body.version);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
