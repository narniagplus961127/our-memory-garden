import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { siteUrl } from "../config";
import { database } from "./db";
import { RequestError } from "./http";
import { sendInviteVerification } from "./invite-auth";

type Invitation = {
  email: string;
  name: string;
  token_hash: string;
  auth_user_id: string | null;
};

export const invitationMaxAge = 24 * 60 * 60;
export const invitationCookie = "garden-invite-claim";
const unavailable = () =>
  new RequestError(404, "This invitation is invalid, expired or already used.");
const noSpace = () =>
  new RequestError(409, "The garden already has two administrators.");

function tokenHash(token: unknown) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw unavailable();
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAdminInvitation(email: string, name: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + invitationMaxAge * 1000);
  await database().begin(async (sql) => {
    // Synchronize with the standalone administrator provisioning script.
    await sql`select pg_advisory_xact_lock(17702601)`;
    const admins = await sql<
      { email: string }[]
    >`select email from garden_administrators`;
    if (admins.some((admin) => admin.email.toLowerCase() === email))
      throw new RequestError(409, "This email already has garden access.");
    if (admins.length >= 2) throw noSpace();
    await sql`
      insert into garden_admin_invitations (email, name, token_hash, expires_at)
      values (${email}, ${name}, ${tokenHash(token)}, ${expiresAt})
      on conflict (email) do update set name=excluded.name,
        token_hash=excluded.token_hash, expires_at=excluded.expires_at,
        code_sent_at=null, code_attempts=0, used_at=null
    `;
  });
  return { url: siteUrl() + "/invite#" + token, expiresAt };
}

export async function readAdminInvitation(token: unknown) {
  const [invite] = await database()<Invitation[]>`
    select email, name, token_hash, auth_user_id from garden_admin_invitations
    where token_hash=${tokenHash(token)} and used_at is null and expires_at>now()
  `;
  if (!invite) throw unavailable();
  return invite;
}

export async function bindInvitationLogin(invite: Invitation, userId: string) {
  const [bound] = await database()<Invitation[]>`
    update garden_admin_invitations set auth_user_id=${userId}
    where token_hash=${invite.token_hash} and used_at is null and expires_at>now()
      and (auth_user_id is null or auth_user_id=${userId})
    returning email, name, token_hash, auth_user_id
  `;
  if (!bound) throw unavailable();
  return bound;
}

export function invitationClaim(invite: Invitation) {
  return createHmac("sha256", process.env.NEON_AUTH_COOKIE_SECRET!)
    .update(
      "garden-admin-invite:" + invite.token_hash + ":" + invite.auth_user_id,
    )
    .digest("base64url");
}

export function hasInvitationClaim(invite: Invitation, claim?: string) {
  if (!invite.auth_user_id || !claim || !/^[A-Za-z0-9_-]{43}$/.test(claim))
    return false;
  return timingSafeEqual(
    Buffer.from(claim),
    Buffer.from(invitationClaim(invite)),
  );
}

export async function sendAdminInvitationCode(invite: Invitation) {
  const [reserved] = await database()`
    update garden_admin_invitations set code_sent_at=now(), code_attempts=0
    where token_hash=${invite.token_hash} and used_at is null and expires_at>now()
      and (code_sent_at is null or code_sent_at<=now()-interval '1 minute')
    returning email
  `;
  if (!reserved)
    throw new RequestError(
      429,
      "Wait one minute before requesting another code.",
    );
  try {
    await sendInviteVerification(invite.email);
  } catch {
    throw new RequestError(
      503,
      "Could not send the code. Please try again in a minute.",
    );
  }
}

export async function reserveInvitationCodeAttempt(invite: Invitation) {
  const [reserved] = await database()`
    update garden_admin_invitations set code_attempts=code_attempts+1
    where token_hash=${invite.token_hash} and used_at is null and expires_at>now()
      and code_sent_at is not null and code_attempts<5
    returning email
  `;
  if (!reserved)
    throw new RequestError(429, "Please request a new verification code.");
}

export async function grantInvitedAccess(
  invite: Invitation,
  user: { id: string; email: string; emailVerified: boolean },
) {
  if (
    !user.emailVerified ||
    user.id !== invite.auth_user_id ||
    user.email.toLowerCase() !== invite.email
  )
    throw new RequestError(403, "Could not verify the invited account.");
  await database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(17702601)`;
    const [pending] = await sql`
      select email from garden_admin_invitations
      where token_hash=${invite.token_hash} and auth_user_id=${user.id}
        and used_at is null and expires_at>now()
      for update
    `;
    if (!pending) throw unavailable();
    const admins = await sql<
      { user_id: string }[]
    >`select user_id from garden_administrators`;
    if (!admins.some((admin) => admin.user_id === user.id)) {
      if (admins.length >= 2) throw noSpace();
      await sql`insert into garden_administrators (user_id, email) values (${user.id}, ${invite.email})`;
    }
    await sql`update garden_admin_invitations set used_at=now() where token_hash=${invite.token_hash}`;
  });
}
