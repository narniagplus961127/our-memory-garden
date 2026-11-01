import "server-only";
import { siteUrl } from "../config";
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(siteUrl()).origin)
    throw new RequestError(403, "Request not permitted.");
}
export async function bodyJson(
  request: Request,
): Promise<Record<string, unknown>> {
  const body = await request.text();
  if (body.length > 1000000)
    throw new RequestError(413, "Content is too large.");
  try {
    const data = JSON.parse(body);
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new RequestError(400, "Invalid request.");
  }
}
export function errorResponse(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23503" &&
    "message" in error &&
    String(error.message).includes("ready photo")
  )
    error = new RequestError(
      409,
      "This photo is no longer available. Choose a ready photo from the shared library.",
    );
  if (error instanceof RequestError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  console.error(
    "Garden request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return Response.json(
    { error: "Could not complete the request. Please try again." },
    { status: 500, headers: { "Cache-Control": "private, no-store" } },
  );
}
export function pageTitle(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 200)
    throw new RequestError(400, "Enter a title between 1 and 200 characters.");
  return value.trim();
}
