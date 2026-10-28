import { currentAdministrator } from "@/lib/server/auth";
import { getHomepage, selectHomepage } from "@/lib/server/homepage";
import {
  RequestError,
  assertSameOrigin,
  bodyJson,
  errorResponse,
} from "@/lib/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const page = await getHomepage();
    if (!page) throw new RequestError(404, "Page not found.");
    return Response.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const administrator = await currentAdministrator(request.headers);
    if (!administrator)
      throw new RequestError(401, "Sign in to manage the homepage.");
    const body = await bodyJson(request);
    if (typeof body.id !== "string")
      throw new RequestError(400, "Choose a public page.");
    return Response.json(await selectHomepage(administrator, body.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
