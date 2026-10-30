import { currentAdministrator } from "@/lib/server/auth";
import { categories, editCategory } from "@/lib/server/organization";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
export async function GET(request: Request) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view categories.");
    return Response.json(await categories(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to organize pages.");
    return Response.json(
      await editCategory(admin, (await bodyJson(request)).name),
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
