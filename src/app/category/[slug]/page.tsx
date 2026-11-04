import { notFound } from "next/navigation";
import { categoryBySlug } from "@/lib/server/categories";
import { gridPages } from "@/lib/server/organization";
import { GardenHeader } from "@/components/garden-header";
import { PageGrid } from "@/components/page-grid";
import { siteUrl } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const category = await categoryBySlug((await params).slug);
  return category
    ? {
        title: category.name,
        alternates: { canonical: siteUrl() + "/category/" + category.slug },
        robots: { index: false, follow: true },
      }
    : { title: "Category not found", robots: { index: false } };
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const category = await categoryBySlug((await params).slug);
  if (!category) notFound();
  const selection = {
    mode: "category" as const,
    categoryId: category.id,
    pageIds: [],
  };
  // Category listings are public even when an administrator is signed in.
  const cards = await gridPages(selection, null);
  return (
    <>
      <GardenHeader />
      <main className="public-page">
        <div className="page-content public-page-heading">
          <h1>{category.name}</h1>
          {!cards.length && (
            <p className="muted">No public pages in this category yet.</p>
          )}
        </div>
        {cards.length > 0 && <PageGrid selection={selection} cards={cards} />}
      </main>
    </>
  );
}
