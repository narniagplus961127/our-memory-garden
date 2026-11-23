import { currentAdministrator } from "@/lib/server/auth";
import { maxPageJsonBytes } from "@/lib/page-json";
import { listPageTemplates } from "@/lib/server/page-templates";
import {
  exportPageJson,
  importPageJson,
  pageJsonSources,
  reviewPageJson,
} from "@/lib/server/page-json";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, { params }: Context) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to export page JSON.");
    const { id } = await params;
    if (new URL(request.url).searchParams.get("sources") === "templates")
      return Response.json(await listPageTemplates(), {
        headers: privateHeaders,
      });
    if (new URL(request.url).searchParams.get("sources") === "1")
      return Response.json(await pageJsonSources(id), {
        headers: privateHeaders,
      });
    const { file, slug } = await exportPageJson(id);
    return new Response(JSON.stringify(file, null, 2) + "\n", {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="' + slug + '.json"',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to import page JSON.");
    const { id } = await params;
    const body = await bodyJson(request, maxPageJsonBytes + 1024);
    const sources = ["file", "sourcePageId", "sourceTemplateId"].filter(
      (key) => body[key] !== undefined,
    );
    if (
      sources.length !== 1 ||
      (body.sourcePageId !== undefined &&
        typeof body.sourcePageId !== "string") ||
      (body.sourceTemplateId !== undefined &&
        typeof body.sourceTemplateId !== "string")
    )
      throw new RequestError(
        400,
        "Choose a JSON file, another page or a template.",
      );
    const input =
      typeof body.sourceTemplateId === "string"
        ? { sourceTemplateId: body.sourceTemplateId }
        : typeof body.sourcePageId === "string"
          ? { sourcePageId: body.sourcePageId }
          : { file: body.file };
    const result =
      body.confirm === true
        ? await importPageJson(id, admin, input)
        : await reviewPageJson(id, input);
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
