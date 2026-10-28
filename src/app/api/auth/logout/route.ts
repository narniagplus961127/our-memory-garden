import { handleAuth } from "@/lib/server/auth";
import { siteUrl } from "@/lib/config";
export async function POST(request: Request) {
  const target = new Request(new URL("/api/auth/sign-out", request.url), {
    method: "POST",
    headers: request.headers,
    body: "{}",
  });
  target.headers.set("Content-Type", "application/json");
  const response = await handleAuth(target);
  if (!response.ok) return response;
  const headers = new Headers({
    Location: siteUrl() + "/login",
    "Cache-Control": "private, no-store",
  });
  for (const cookie of response.headers.getSetCookie())
    headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}
