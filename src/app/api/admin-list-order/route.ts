import { currentAdministrator } from "@/lib/server/auth";
import { saveAdminListOrder } from "@/lib/server/admin-list-order";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await currentAdministrator(request.headers))) {
      throw new RequestError(401, "Sign in to reorder this list.");
    }
    const { list, ids, version } = await bodyJson(request);
    if (list !== "pages" && list !== "categories") {
      throw new RequestError(400, "Invalid admin list.");
    }
    return Response.json(await saveAdminListOrder(list, ids, version), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
