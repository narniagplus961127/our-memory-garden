import { cookies } from "next/headers";
import { isConfigured, siteUrl } from "@/lib/config";
import { limitRequest } from "@/lib/server/request-rate-limit";
import {
  bindInvitationLogin,
  grantInvitedAccess,
  hasInvitationClaim,
  invitationClaim,
  invitationCookie,
  invitationMaxAge,
  readAdminInvitation,
  reserveInvitationCodeAttempt,
  sendAdminInvitationCode,
} from "@/lib/server/admin-invitations";
import {
  authenticateInvite,
  verifyInviteAddress,
} from "@/lib/server/invite-auth";
import {
  assertSameOrigin,
  bodyJson,
  errorResponse,
  RequestError,
} from "@/lib/server/http";

const noStore = { "Cache-Control": "private, no-store" };
const reply = (data: object) => Response.json(data, { headers: noStore });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const limited = limitRequest(request, "invitations", 30);
    if (limited) return limited;
    if (!isConfigured())
      throw new RequestError(503, "The garden is unavailable.");
    const { action, token, password, code } = await bodyJson(request, 2048);
    const invite = await readAdminInvitation(token);
    const jar = await cookies();
    const claimed = hasInvitationClaim(
      invite,
      jar.get(invitationCookie)?.value,
    );
    if (action === "details")
      return reply({
        email: invite.email,
        name: invite.name,
        stage: claimed ? "code" : "password",
      });
    if (action === "start") {
      if (
        typeof password !== "string" ||
        password.length < 12 ||
        password.length > 128
      )
        throw new RequestError(
          400,
          "Choose a password with 12 to 128 characters.",
        );
      const userId = await authenticateInvite(
        { email: invite.email, name: invite.name, password },
        invite.auth_user_id,
      );
      const bound = await bindInvitationLogin(invite, userId);
      jar.set(invitationCookie, invitationClaim(bound), {
        httpOnly: true,
        secure: new URL(siteUrl()).protocol === "https:",
        sameSite: "strict",
        path: "/api/invitations",
        maxAge: invitationMaxAge,
      });
      try {
        await sendAdminInvitationCode(bound);
        return reply({
          stage: "code",
          message: "Check your email for the verification code.",
        });
      } catch (error) {
        if (!(error instanceof RequestError)) throw error;
        return reply({ stage: "code", message: error.message });
      }
    }
    if (!claimed)
      throw new RequestError(
        403,
        "Continue with your password before verifying your email.",
      );
    if (action === "resend") {
      await sendAdminInvitationCode(invite);
      return reply({ message: "A new code was sent. Use the latest email." });
    }
    if (action === "verify") {
      if (typeof code !== "string" || !/^\d{6}$/.test(code))
        throw new RequestError(400, "Enter the six-digit verification code.");
      await reserveInvitationCodeAttempt(invite);
      const user = await verifyInviteAddress(invite.email, code);
      await grantInvitedAccess(invite, user);
      jar.set(invitationCookie, "", { path: "/api/invitations", maxAge: 0 });
      return reply({ stage: "done" });
    }
    throw new RequestError(400, "Invalid invitation action.");
  } catch (error) {
    return errorResponse(error);
  }
}
