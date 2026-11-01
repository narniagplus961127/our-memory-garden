import { currentAdministrator } from "@/lib/server/auth";
import {
  assertSameOrigin,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
import { generateExport } from "@/lib/server/exports";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to prepare an export.");
    return Response.json(await generateExport((await params).id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
