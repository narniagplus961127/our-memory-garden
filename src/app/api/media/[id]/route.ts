import { assertSameOrigin, bodyJson } from "@/lib/server/http";
import { deletePhoto } from "@/lib/server/media";
import { currentAdministrator } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/http";
import { getPhoto } from "@/lib/server/media";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view photo details.");
    const photo = await getPhoto((await params).id);
    if (!photo) throw new RequestError(404, "Photo not found.");
    return Response.json(photo, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to delete a photo.");
    if ((await bodyJson(request)).confirm !== true)
      throw new RequestError(400, "Confirm photo deletion first.");
    return Response.json(await deletePhoto((await params).id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
