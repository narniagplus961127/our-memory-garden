import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  // Never enumerate private addresses. Public noindex pages remain crawlable to see noindex.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/login",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: siteUrl() + "/sitemap.xml",
  };
}
