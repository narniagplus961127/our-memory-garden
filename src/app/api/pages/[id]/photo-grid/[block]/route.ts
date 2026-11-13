import { findPhotoGrid, photoGridRef } from "@/lib/photo-grid";
import { uuid } from "@/lib/organization";
import { currentAdministrator } from "@/lib/server/auth";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
import { historicalPage } from "@/lib/server/page-recovery";
import { getVisiblePage } from "@/lib/server/pages";
import {
  changePhotoGrid,
  parseGridChange,
  readGridBatch,
} from "@/lib/server/photo-grids";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; block: string }> };
const noStore = { "Cache-Control": "private, no-store" };
const missing = () => new RequestError(404, "Photo grid not found.");

export async function GET(request: Request, { params }: Context) {
  try {
    const { id, block } = await params;
    const admin = await currentAdministrator(request.headers);
    const query = new URL(request.url).searchParams;
    const offset = Number(query.get("offset") ?? "0");
    const history = query.get("history");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 2147483647)
      throw new RequestError(400, "Invalid photo offset.");
    if (history !== null && !admin) throw missing();
    const page =
      history === null
        ? await getVisiblePage(id, admin)
        : (await historicalPage(id, Number(history))).snapshot;
    const ref = page && photoGridRef(findPhotoGrid(page.content, block));
    if (!ref) throw missing();
    if (
      query.get("grid") !== ref.gridId ||
      query.get("revision") !== String(ref.gridRevision)
    )
      throw new RequestError(
        409,
        "This photo grid changed. Refresh to see the latest photos.",
      );
    const batch = await readGridBatch(ref, offset, Boolean(admin));
    return Response.json(batch, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to edit photos.");
    const { id, block } = await params;
    if (!uuid.test(id)) throw missing();
    const body = await bodyJson(request);
    if (
      typeof body.gridId !== "string" ||
      !uuid.test(body.gridId) ||
      !Number.isSafeInteger(body.gridRevision) ||
      Number(body.gridRevision) < 1 ||
      typeof body.requestId !== "string" ||
      !uuid.test(body.requestId)
    )
      throw new RequestError(400, "Invalid photo grid revision.");
    const result = await changePhotoGrid(
      admin,
      id,
      block,
      {
        gridId: body.gridId,
        gridRevision: Number(body.gridRevision),
      },
      parseGridChange(body),
      body.requestId,
    );
    return Response.json(result, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
