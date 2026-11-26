// Keep retired API requests out of the streamed page-not-found fallback.
function unavailable() {
  return Response.json(
    { error: "Garden export is no longer available." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = unavailable;
export const POST = unavailable;
export const PUT = unavailable;
export const PATCH = unavailable;
export const DELETE = unavailable;
export const OPTIONS = unavailable;

export function HEAD() {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
