import { PublicHeader, GardenCat } from "@/components/brand";
import { getHomepage } from "@/lib/server/homepage";
import { isConfigured } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const page = isConfigured() ? await getHomepage() : null;
  return (
    <>
      <PublicHeader />
      <main className="page-content">
        <p className="eyebrow">Our garden</p>
        <h1>{page?.title ?? "Our Memory Garden"}</h1>
        {page ? (
          page.content.content
            .filter((block) => block.type === "Text")
            .map((block) => (
              <p className="text-block" key={block.props.id}>
                {typeof block.props.text === "string" ? block.props.text : ""}
              </p>
            ))
        ) : (
          <p className="muted">A little place for the moments we share.</p>
        )}
        <GardenCat />
      </main>
    </>
  );
}
