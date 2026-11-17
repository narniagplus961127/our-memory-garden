import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { emailOTP } from "better-auth/plugins/email-otp";
function createLocal() {
  // The garden's Auth route allowlist keeps local signup behind invitations.
  return betterAuth(localAuthOptions(true));
}
let local: ReturnType<typeof createLocal> | undefined;
export function localAuthOptions(provisioning = false) {
  if (
    (process.env.AUTH_MODE ?? process.env.AUTH_PROVIDER) !== "local" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Local authentication is restricted to local development.");
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://127.0.0.1:3000";
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error("Local authentication requires a loopback site URL.");
  return {
    baseURL: url,
    secret: process.env.NEON_AUTH_COOKIE_SECRET,
    database: new Pool({ connectionString: process.env.DATABASE_URL, max: 3 }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !provisioning,
      minPasswordLength: 12,
      sendResetPassword: async ({
        user,
        url,
      }: {
        user: { email: string };
        url: string;
      }) => {
        await mkdir("work/local-mail", { recursive: true });
        await writeFile(
          "work/local-mail/" + encodeURIComponent(user.email) + ".json",
          JSON.stringify({ to: user.email, url }),
        );
      },
    },
    session: { cookieCache: { enabled: false } },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "email-verification") return;
          await mkdir("work/local-mail", { recursive: true });
          await writeFile(
            "work/local-mail/" + encodeURIComponent(email) + ".otp.json",
            JSON.stringify({ to: email, otp }),
          );
        },
      }),
    ],
    trustedOrigins: [url],
  };
}
export function localAuth() {
  return (local ??= createLocal());
}
