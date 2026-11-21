import { currentAdministrator } from "@/lib/server/auth";
import { isAdminList } from "@/lib/admin-list-order";
import {
  saveAdminListOrder,
  savePartialPageOrder,
} from "@/lib/server/admin-list-order";
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
    const { list, ids, version, move, partial } = await bodyJson(request);
    if (
      !isAdminList(list) ||
      (partial !== undefined && typeof partial !== "boolean")
    ) {
      throw new RequestError(400, "Invalid admin list.");
    }
    const order =
      list === "categories"
        ? await saveCategoryTree(ids, version, move)
        : list === "pages" && partial
          ? await savePartialPageOrder(ids, version)
          : await saveAdminListOrder(list, ids, version);
    return Response.json(order, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
