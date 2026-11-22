import "server-only";
import { siteUrl } from "../config";
import { readBoundedText, RequestSizeError } from "./request-body";
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
  maxSize?: number,
): Promise<Record<string, unknown>> {
  try {
    // Preserve the legacy million-character editor allowance, including Chinese
    // text, with a finite UTF-8 byte ceiling while the body is being read.
    const body = await readBoundedText(request, maxSize ?? 3_000_000);
    if (maxSize === undefined && body.length > 1_000_000)
      throw new RequestSizeError();
    const data = JSON.parse(body);
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch (error) {
    if (error instanceof RequestSizeError)
      throw new RequestError(413, error.message);
    throw new RequestError(400, "Invalid request.");
  }
}
export function errorResponse(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "constraint_name" in error &&
    error.constraint_name === "pages_category_ids_fkey"
  )
    error = new RequestError(400, "Choose existing categories.");
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
