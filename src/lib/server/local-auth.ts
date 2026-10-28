import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
function createLocal() {
  return betterAuth(localAuthOptions());
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
    trustedOrigins: [url],
  };
}
export function localAuth() {
  return (local ??= createLocal());
}
