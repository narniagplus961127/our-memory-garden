import type { Metadata } from "next";
import { GardenHeader } from "@/components/garden-header";
import { GardenFooter } from "@/components/garden-footer";
import { PageCards } from "@/components/page-cards";
import { isConfigured, siteUrl } from "@/lib/config";
import { publicGardenPages } from "@/lib/server/organization";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Garden",
  alternates: { canonical: siteUrl() + "/garden" },
  robots: { index: false, follow: true },
};

export default async function GardenIndex() {
  const cards = isConfigured() ? await publicGardenPages() : [];

  return (
    <>
      <GardenHeader />
      <main className="public-page">
        <div className="page-content public-page-heading">
          <h1>Garden</h1>
          {cards.length === 0 && <p className="muted">No public pages yet.</p>}
        </div>
        {cards.length > 0 && <PageCards cards={cards} />}
      </main>
      <GardenFooter />
    </>
  );
}
