import { GardenContent } from "@/components/garden-content";
import { PublicHeader, GardenCat } from "@/components/brand";
import { getHomepage } from "@/lib/server/homepage";
import { isConfigured } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const page = isConfigured() ? await getHomepage() : null;
  return (
    <>
      <PublicHeader />
      <main className="public-page">
        <div className="page-content">
          <p className="eyebrow">Our garden</p>
          <h1>{page?.title ?? "Our Memory Garden"}</h1>
        </div>
        {page ? (
          <GardenContent data={page.content} />
        ) : (
          <p className="muted">A little place for the moments we share.</p>
        )}
        <div className="page-content">
          <GardenCat />
        </div>
      </main>
    </>
  );
}
