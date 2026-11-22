import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { pageChoices } from "@/lib/server/page-choices";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to choose a garden page.");
    return Response.json(await pageChoices(new URL(request.url).searchParams), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
