import "server-only";
import { authMode, siteUrl } from "../config";
import { neonAuth } from "./auth";
import { RequestError } from "./http";
import { localAuth } from "./local-auth";

type Credentials = { email: string; name: string; password: string };
type VerifiedAccount = { id: string; email: string; emailVerified: boolean };

// The pinned Neon SDK does not type the server email OTP methods.
function neonEmailOtp(
  action: "send-verification-otp" | "verify-email",
  input: object,
) {
  return fetch(
    process.env.NEON_AUTH_BASE_URL!.replace(/\/$/, "") + "/email-otp/" + action,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: siteUrl() },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    },
  );
}

export async function authenticateInvite(
  { email, name, password }: Credentials,
  existingId: string | null,
) {
  const credentials = { email, password };
  let user: { id: string; email: string } | undefined;
  if (authMode() === "local") {
    try {
      if (existingId) {
        user = (await localAuth().api.signInEmail({ body: credentials })).user;
      } else {
        try {
          user = (
            await localAuth().api.signUpEmail({
              body: { ...credentials, name },
            })
          ).user;
        } catch (error) {
          if (
            !error ||
            typeof error !== "object" ||
            !("statusCode" in error) ||
            error.statusCode !== 422
          )
            throw error;
          user = (await localAuth().api.signInEmail({ body: credentials }))
            .user;
        }
      }
    } catch {
      throw new RequestError(400, "Use the password for the invited email.");
    }
  } else {
    const result = existingId
      ? await neonAuth().signIn.email(credentials)
      : await neonAuth().signUp.email({ ...credentials, name });
    if (!existingId && result.error && result.error.status === 422) {
      user = (await neonAuth().signIn.email(credentials)).data?.user;
    } else {
      user = result.data?.user;
    }
  }
  if (
    !user ||
    user.email.toLowerCase() !== email ||
    (existingId && existingId !== user.id)
  )
    throw new RequestError(
      400,
      "Could not set up this login. If you already chose a password, enter the same one.",
    );
  return user.id;
}

export async function sendInviteVerification(email: string) {
  const input = { email, type: "email-verification" as const };
  if (authMode() === "local") {
    await localAuth().api.sendVerificationOTP({ body: input });
  } else {
    const response = await neonEmailOtp("send-verification-otp", input);
    if (!response.ok)
      throw new RequestError(503, "Could not send the verification code.");
  }
}

export async function verifyInviteAddress(email: string, otp: string) {
  const input = { email, otp };
  if (authMode() === "local") {
    try {
      return (await localAuth().api.verifyEmailOTP({ body: input })).user;
    } catch {
      throw new RequestError(400, "That code is incorrect or has expired.");
    }
  }
  const response = await neonEmailOtp("verify-email", input);
  if (response.status >= 500)
    throw new RequestError(
      503,
      "Email verification is unavailable. Try again shortly.",
    );
  if (!response.ok)
    throw new RequestError(400, "That code is incorrect or has expired.");
  const { user }: { user?: Partial<VerifiedAccount> } = await response.json();
  if (
    !user ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    user.emailVerified !== true
  )
    throw new RequestError(403, "Could not verify the invited account.");
  return { id: user.id, email: user.email, emailVerified: user.emailVerified };
}
