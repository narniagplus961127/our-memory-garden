import { templateData, templates } from "@/lib/blocks";
import { getPageTemplate } from "@/lib/server/page-templates";
import { currentAdministrator } from "@/lib/server/auth";
import { createPrivatePage, listPages } from "@/lib/server/pages";
import {
  RequestError,
  assertSameOrigin,
  bodyJson,
  errorResponse,
  pageTitle,
} from "@/lib/server/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to manage the garden.");
    return Response.json(await listPages(admin), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to manage the garden.");
    const body = await bodyJson(request);
    const builtin = templates.find((template) => template.id === body.template);
    const custom =
      !builtin && typeof body.template === "string"
        ? await getPageTemplate(body.template)
        : null;
    if (body.template !== undefined && !builtin && !custom)
      throw new RequestError(400, "Choose an available template.");
    return Response.json(
      await createPrivatePage(
        admin,
        pageTitle(body.title),
        custom?.content ?? templateData(builtin?.id),
        body.slug,
      ),
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
