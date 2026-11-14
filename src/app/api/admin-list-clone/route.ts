import { isAdminList } from "@/lib/admin-list-order";
import { uuid } from "@/lib/organization";
import { currentAdministrator } from "@/lib/server/auth";
import { cloneCategory } from "@/lib/server/categories";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
import { clonePrivatePage } from "@/lib/server/page-json";
import { clonePageTemplate } from "@/lib/server/page-templates";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to clone this item.");
    const { list, sourceId, id } = await bodyJson(request, 2048);
    if (
      !isAdminList(list) ||
      typeof sourceId !== "string" ||
      !uuid.test(sourceId) ||
      typeof id !== "string" ||
      !uuid.test(id) ||
      id.toLowerCase() === sourceId.toLowerCase()
    )
      throw new RequestError(400, "Invalid clone request.");

    const result =
      list === "pages"
        ? await clonePrivatePage(admin, sourceId, id)
        : list === "categories"
          ? await cloneCategory(admin, sourceId, id)
          : await clonePageTemplate(sourceId, id);
    return Response.json(result, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
