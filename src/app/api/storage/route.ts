import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { storageUsage } from "@/lib/server/exports";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view storage.");
    return Response.json(await storageUsage(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
