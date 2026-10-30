import { currentAdministrator } from "@/lib/server/auth";
import {
  assertSameOrigin,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
import { completePhoto } from "@/lib/server/media";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to upload photos.");
    return Response.json(await completePhoto((await params).id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
