import { validatePageReferences } from "@/lib/server/page-references";
import { validPageData } from "@/lib/blocks";
import { currentAdministrator } from "@/lib/server/auth";
import { getVisiblePage, savePage } from "@/lib/server/pages";
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
    if (body.accountId !== undefined && body.accountId !== admin.id)
      throw new RequestError(
        401,
        "Sign in again before continuing this editor.",
      );
    if (
      !Number.isSafeInteger(body.version) ||
      Number(body.version) < 1 ||
      (body.title === undefined &&
        body.visibility === undefined &&
        body.text === undefined &&
        body.content === undefined) ||
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
    if (
      body.content !== undefined &&
      (!validPageData(body.content) || body.text !== undefined)
    )
      throw new RequestError(400, "Invalid page content.");

    if (
      body.editorSessionId !== undefined &&
      (typeof body.editorSessionId !== "string" ||
        !/^[\w-]{1,120}$/.test(body.editorSessionId))
    )
      throw new RequestError(400, "Invalid editor session.");
    const id = (await params).id;
    const existing = await getVisiblePage(id, admin);
    if (!existing) throw new RequestError(404, "Page not found.");
    if (body.content !== undefined)
      await validatePageReferences(
        body.content as import("@/lib/pages").PageData,
        existing.content,
      );
    const result = await savePage(admin, id, {
      version: Number(body.version),
      ...(body.title === undefined ? {} : { title: pageTitle(body.title) }),
      ...(body.content === undefined
        ? {}
        : { content: body.content as import("@/lib/pages").PageData }),
      ...(body.text === undefined ? {} : { text: body.text as string }),
      ...(body.visibility === undefined
        ? {}
        : { visibility: body.visibility as "public" | "private" }),
      editorSessionId: body.editorSessionId as string | undefined,
      reason: body.reason as string | undefined,
    });
    return Response.json(result.kind === "saved" ? result.page : result, {
      status: result.kind === "saved" ? 200 : 409,

      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
