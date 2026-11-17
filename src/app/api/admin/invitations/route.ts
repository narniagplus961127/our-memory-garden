import { currentAdministrator } from "@/lib/server/auth";
import { issueAdminInvitation } from "@/lib/server/admin-invitations";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await currentAdministrator(request.headers)))
      throw new RequestError(401, "Sign in to create an invitation.");
    const body = await bodyJson(request, 2048);
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      throw new RequestError(400, "Enter a valid email address.");
    if (!name || name.length > 100)
      throw new RequestError(400, "Enter a name of up to 100 characters.");
    return Response.json(await issueAdminInvitation(email, name), {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
