import { currentAdministrator } from "@/lib/server/auth";
import {
  getVisiblePage,
  updatePageText,
  updatePageVisibility,
} from "@/lib/server/pages";
import {
  RequestError,
  assertSameOrigin,
  bodyJson,
  errorResponse,
  pageTitle,
} from "@/lib/server/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const page = await getVisiblePage(
      (await params).id,
      await currentAdministrator(request.headers),
    );
    if (!page) throw new RequestError(404, "Page not found.");
    return Response.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to edit pages.");
    const body = await bodyJson(request);
    if (
      !Number.isSafeInteger(body.version) ||
      (body.visibility === undefined && typeof body.text !== "string") ||
      (body.text !== undefined &&
        (typeof body.text !== "string" || body.text.length > 100000))
    )
      throw new RequestError(400, "Invalid page content.");
    if (
      body.visibility !== undefined &&
      body.visibility !== "private" &&
      body.visibility !== "public"
    )
      throw new RequestError(400, "Choose public or private visibility.");
    const id = (await params).id;
    const existing = await getVisiblePage(id, admin);
    if (!existing) throw new RequestError(404, "Page not found.");
    const page =
      typeof body.text !== "string"
        ? await updatePageVisibility(
            admin,
            id,
            body.visibility as "public" | "private",
            Number(body.version),
          )
        : await updatePageText(
            admin,
            id,
            pageTitle(body.title),
            body.text,
            Number(body.version),
            body.visibility as "public" | "private" | undefined,
          );
    if (!page)
      throw new RequestError(
        409,
        "This page changed elsewhere. Reload to see the latest version.",
      );
    return Response.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
