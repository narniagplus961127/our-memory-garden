import { currentAdministrator } from "@/lib/server/auth";
import { maxPageJsonBytes } from "@/lib/page-json";
import {
  exportPageJson,
  importPageJson,
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
    const file = await exportPageJson((await params).id);
    return new Response(JSON.stringify(file, null, 2) + "\n", {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="' + file.page.slug + '.json"',
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
    const result =
      body.confirm === true
        ? await importPageJson(id, admin, body.file, body.version)
        : await reviewPageJson(id, body.file);
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
