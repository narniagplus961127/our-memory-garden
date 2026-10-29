import { templates, type TemplateId } from "@/lib/blocks";
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
    if (
      body.template !== undefined &&
      !templates.some((template) => template.id === body.template)
    )
      throw new RequestError(400, "Choose an available template.");
    return Response.json(
      await createPrivatePage(
        admin,
        pageTitle(body.title),
        body.template as TemplateId | undefined,
      ),
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
