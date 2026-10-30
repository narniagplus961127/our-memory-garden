import { currentAdministrator } from "@/lib/server/auth";
import {
  publicNavigation,
  readNavigation,
  saveNavigation,
} from "@/lib/server/navigation";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const admin = await currentAdministrator(request.headers);
    return Response.json(
      admin ? await readNavigation() : { items: await publicNavigation() },
      { headers },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to manage navigation.");
    const body = await bodyJson(request);
    return Response.json(
      await saveNavigation(body.items, body.version, admin),
      { headers },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
