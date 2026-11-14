import { currentAdministrator } from "@/lib/server/auth";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
import { copyPage } from "@/lib/server/page-json";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to copy pages.");
    const copy = await copyPage(admin, await bodyJson(request));
    return Response.json(copy, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
