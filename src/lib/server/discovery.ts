import "server-only";
import type { Metadata } from "next";
import type { GardenPage } from "../pages";
import { siteUrl } from "../config";
import { displayPhotoUrl } from "../media";
export function canonicalAddress(page: GardenPage) {
  return siteUrl() + (page.is_homepage ? "/" : "/garden/" + page.slug);
}
export function publicMetadata(page: GardenPage | null): Metadata {
  if (!page || page.visibility !== "public" || page.deleted_at)
    return {
      title: { absolute: "Our Memory Garden" },
      description: "A little place for the moments we share.",
      robots: { index: false, follow: false },
      openGraph: null,
      twitter: null,
      alternates: { canonical: null },
    };
  const title = page.sharing_title?.trim() || page.title;
  const description =
    page.sharing_description?.trim() ||
    "A little place for the moments we share.";
  const photo = page.sharing_cover_photo_id || page.cover_photo_id;
  const images = photo ? [siteUrl() + displayPhotoUrl(photo)] : [];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalAddress(page) },
    robots: { index: page.allow_indexing !== false, follow: true },
    openGraph: {
      type: "website",
      siteName: "Our Memory Garden",
      title,
      description,
      url: canonicalAddress(page),
      images,
    },
    twitter: {
      card: photo ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}
