import { currentAdministrator } from "@/lib/server/auth";
import { editCategory } from "@/lib/server/organization";
import { categoryById, deleteCategory } from "@/lib/server/categories";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to organize pages.");
    const body = await bodyJson(request);
    return Response.json(
      await editCategory(
        admin,
        body.name,
        (await params).id,
        body.expectedName,
        { slug: body.slug, expectedSlug: body.expectedSlug },
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to view categories.");
    const category = await categoryById((await params).id);
    if (!category) throw new RequestError(404, "Category not found.");
    return Response.json(category, {
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
    const admin = await currentAdministrator(request.headers);
    if (!admin) throw new RequestError(401, "Sign in to organize pages.");
    return Response.json(
      await deleteCategory(admin, (await params).id, await bodyJson(request)),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
