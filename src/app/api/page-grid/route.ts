import { currentAdministrator } from "@/lib/server/auth";
import { gridPages } from "@/lib/server/organization";
import { errorResponse, RequestError } from "@/lib/server/http";
import { validGrid } from "@/lib/organization";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    let selection: unknown;
    try {
      selection = JSON.parse(
        new URL(request.url).searchParams.get("selection") ?? "null",
      );
    } catch {
      throw new RequestError(400, "Choose pages or a category for this grid.");
    }
    if (!validGrid(selection))
      throw new RequestError(400, "Choose pages or a category for this grid.");
    return Response.json(
      await gridPages(selection, await currentAdministrator(request.headers)),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
