import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { database } from "./db";
import { localAuth } from "./local-auth";
import { authMode, isConfigured, siteUrl } from "../config";
import type { Administrator } from "./pages";
let neon: ReturnType<typeof createNeonAuth> | undefined;
function neonAuth() {
  return (neon ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      sessionDataTtl: 0,
    },
  }));
}
export async function currentAdministrator(
  requestHeaders?: Headers,
): Promise<Administrator | null> {
  if (!isConfigured()) return null;
  const user =
    authMode() === "local"
      ? (
          await localAuth().api.getSession({
            headers: requestHeaders ?? (await headers()),
          })
        )?.user
      : (await neonAuth().getSession()).data?.user;
  if (!user) return null;
  const rows =
    await database()`select user_id from garden_administrators where user_id=${user.id} limit 1`;
  return rows.length
    ? { id: user.id, email: user.email, name: user.name }
    : null;
}
export async function requireAdministrator(): Promise<Administrator> {
  const admin = await currentAdministrator();
  if (!admin) redirect("/login");
  return admin;
}
export async function handleAuth(request: Request): Promise<Response> {
  if (!isConfigured())
    return Response.json(
      { message: "The garden is not connected yet." },
      { status: 503 },
    );
  const path = new URL(request.url).pathname.replace(/^\/api\/auth\//, "");
  if (
    ![
      "get-session",
      "sign-in/email",
      "sign-out",
      "request-password-reset",
      "reset-password",
    ].includes(path) &&
    !(request.method === "GET" && path.startsWith("reset-password/"))
  )
    return Response.json({ message: "Not found" }, { status: 404 });
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    if (origin !== new URL(siteUrl()).origin)
      return Response.json(
        { message: "Request not permitted." },
        { status: 403 },
      );
    if (path === "sign-in/email" || path === "request-password-reset") {
      let body: Record<string, unknown>;
      try {
        body = await request.clone().json();
      } catch {
        return Response.json({ message: "Invalid request." }, { status: 400 });
      }
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const exists =
        email.length < 255 &&
        (
          await database()`select user_id from garden_administrators where lower(email)=${email} limit 1`
        ).length > 0;
      if (!exists)
        return path === "request-password-reset"
          ? Response.json({ status: true })
          : Response.json(
              { message: "Email or password is incorrect." },
              { status: 401 },
            );
      if (path === "request-password-reset") {
        body.redirectTo = siteUrl() + "/reset-password";
        request = new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify(body),
        });
      }
    }
  }
  const response =
    authMode() === "local"
      ? await localAuth().handler(request)
      : await neonAuth()
          .handler()
          [request.method === "GET" ? "GET" : "POST"](request, {
            params: Promise.resolve({ path: path.split("/") }),
          });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
