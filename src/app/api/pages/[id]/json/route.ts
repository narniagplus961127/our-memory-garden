import { currentAdministrator } from "@/lib/server/auth";
import { maxPageJsonBytes } from "@/lib/page-json";
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
    if (
      body.sourcePageId !== undefined &&
      (typeof body.sourcePageId !== "string" || body.file !== undefined)
    )
      throw new RequestError(400, "Choose a JSON file or another page.");
    const input =
      typeof body.sourcePageId === "string"
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
