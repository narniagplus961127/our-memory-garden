import { GardenContent } from "@/components/garden-content";
import { GardenCat } from "@/components/brand";
import { GardenHeader } from "@/components/garden-header";
import { getHomepage } from "@/lib/server/homepage";
import { isConfigured } from "@/lib/config";
import { publicMetadata } from "@/lib/server/discovery";
export async function generateMetadata() {
  return publicMetadata(isConfigured() ? await getHomepage() : null);
}
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const page = isConfigured() ? await getHomepage() : null;
  return (
    <>
      <GardenHeader pageId={page?.id} />
      <main className="public-page public-homepage">
        <div
          className="page-content public-page-heading"
          style={{
            display:
              page?.content.root.props.showTitle === false ? "none" : undefined,
          }}
        >
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
