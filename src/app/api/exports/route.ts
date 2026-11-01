import { currentAdministrator } from "@/lib/server/auth";
import {
  assertSameOrigin,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
import { createExport, getExport } from "@/lib/server/exports";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to manage exports.");
    return Response.json(await getExport(), {
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
    if (!admin) throw new RequestError(401, "Sign in to export the garden.");
    return Response.json(await createExport(admin), {
      status: 202,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
