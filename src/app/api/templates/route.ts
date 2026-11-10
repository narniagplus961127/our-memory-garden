import { currentAdministrator } from "@/lib/server/auth";
import { createPageTemplate } from "@/lib/server/page-templates";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to manage templates.");
    return Response.json(
      await createPageTemplate(admin, await bodyJson(request)),
      {
        status: 201,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
