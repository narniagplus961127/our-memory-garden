import type { MetadataRoute } from "next";
import { database } from "@/lib/server/db";
import { isConfigured } from "@/lib/config";
import { canonicalAddress } from "@/lib/server/discovery";
import type { GardenPage } from "@/lib/pages";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isConfigured()) return [];
  const pages = await database()<
    GardenPage[]
  >`select pages.*, exists(select 1 from garden_settings where homepage_id=pages.id) as is_homepage from pages where visibility='public' and deleted_at is null and allow_indexing=true order by id`;
  return pages.map((page) => ({
    url: canonicalAddress(page),
    lastModified: page.updated_at,
  }));
}
