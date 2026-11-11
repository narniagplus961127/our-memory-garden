import { copyTemplateForPage, starterTemplates } from "@/lib/page-templates";
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
    let content;
    if (body.template !== undefined && body.template !== "blank") {
      if (typeof body.template !== "string")
        throw new RequestError(400, "Choose an available template.");
      const starter = starterTemplates.find(
        ({ alias }) => alias === body.template,
      );
      const template = await getPageTemplate(starter?.id ?? body.template);
      if (!template)
        throw new RequestError(400, "Choose an available template.");
      content = copyTemplateForPage(template.content);
    }
    return Response.json(
      await createPrivatePage(admin, pageTitle(body.title), content, body.slug),
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
