import { notFound } from "next/navigation";
import { categories, categoryBySlug } from "@/lib/server/categories";
import { gridPages } from "@/lib/server/organization";
import { GardenHeader } from "@/components/garden-header";
import { GardenFooter } from "@/components/garden-footer";
import { PageCards } from "@/components/page-cards";
import { siteUrl } from "@/lib/config";
import Link from "next/link";
import { categoryPath } from "@/lib/organization";
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
  const [cards, list] = await Promise.all([
    gridPages(selection, null),
    categories(),
  ]);
  const ancestors = categoryPath(category, list).slice(0, -1);
  return (
    <>
      <GardenHeader />
      <main className="public-page">
        <div className="page-content public-page-heading">
          {ancestors.length > 0 && (
            <nav
              aria-label="Parent categories"
              className="mb-3 flex flex-wrap items-center gap-2 text-sm"
            >
              {ancestors.map((parent) => (
                <span
                  key={parent.id}
                  className="inline-flex items-center gap-2"
                >
                  <Link
                    href={"/category/" + parent.slug}
                    className="underline underline-offset-4"
                  >
                    {parent.name}
                  </Link>
                  <span aria-hidden="true">›</span>
                </span>
              ))}
            </nav>
          )}
          <h1>{category.name}</h1>
          {!cards.length && (
            <p className="muted">No public pages in this category yet.</p>
          )}
        </div>
        {cards.length > 0 && <PageCards cards={cards} />}
      </main>
      <GardenFooter />
    </>
  );
}
