export function authMode() {
  return process.env.AUTH_MODE ?? process.env.AUTH_PROVIDER ?? "neon";
}
export function isConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    (authMode() === "local" || process.env.NEON_AUTH_BASE_URL),
  );
}
export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
