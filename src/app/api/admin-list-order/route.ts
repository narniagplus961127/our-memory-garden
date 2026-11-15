import { currentAdministrator } from "@/lib/server/auth";
import { isAdminList } from "@/lib/admin-list-order";
import { saveAdminListOrder } from "@/lib/server/admin-list-order";
import { saveCategoryTree } from "@/lib/server/categories";
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
    const { list, ids, version, move } = await bodyJson(request);
    if (!isAdminList(list)) {
      throw new RequestError(400, "Invalid admin list.");
    }
    const order =
      list === "categories"
        ? await saveCategoryTree(ids, version, move)
        : await saveAdminListOrder(list, ids, version);
    return Response.json(order, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
