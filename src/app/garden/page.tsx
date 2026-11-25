import type { Metadata } from "next";
import { GardenHeader } from "@/components/garden-header";
import { GardenFooter } from "@/components/garden-footer";
import { PageCards } from "@/components/page-cards";
import { isConfigured, siteUrl } from "@/lib/config";
import { publicGardenFacets, publicPageBatch } from "@/lib/server/page-list";
import { type PageSearchParams } from "@/lib/page-list";
import { ListPagination } from "@/components/list-pagination";
import { readGardenQuery, gardenFilterParams } from "@/lib/garden-browse";
import { GardenFilters } from "@/components/garden-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Garden",
  alternates: { canonical: siteUrl() + "/garden" },
  robots: { index: false, follow: true },
};

export default async function GardenIndex({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const query = readGardenQuery(await searchParams);
  const { page } = query;
  const [{ cards, more }, facets] = isConfigured()
    ? await Promise.all([
        publicPageBatch(page, query.categoryId || undefined, {
          ...query,
          excludeHomepage: true,
        }),
        publicGardenFacets(),
      ])
    : [
        { cards: [], more: false },
        { years: [], categories: [] },
      ];

  return (
    <>
      <GardenHeader />
      <main className="public-page">
        <div className="page-content public-page-heading">
          <h1>Garden</h1>
          <GardenFilters query={query} {...facets} />
          {cards.length === 0 && (
            <p className="muted">
              {query.search || query.year || query.categoryId
                ? "No memories match these filters. Try another year, category or search."
                : page > 1
                  ? "No more pages."
                  : "No public pages yet."}
            </p>
          )}
        </div>
        {cards.length > 0 && <PageCards cards={cards} />}
        <ListPagination
          path="/garden"
          page={page}
          more={more}
          extra={gardenFilterParams(query)}
        />
      </main>
      <GardenFooter />
    </>
  );
}
