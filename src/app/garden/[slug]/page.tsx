import { GardenContent } from "@/components/garden-content";
import { GardenHeader } from "@/components/garden-header";
import { GardenFooter } from "@/components/garden-footer";
import { currentAdministrator } from "@/lib/server/auth";
import { getPageBySlug } from "@/lib/server/addresses";
import { notFound } from "next/navigation";
import { publicMetadata } from "@/lib/server/discovery";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return publicMetadata(await getPageBySlug((await params).slug, null));
}
export const dynamic = "force-dynamic";
export default async function GardenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const page = await getPageBySlug(
    (await params).slug,
    await currentAdministrator(),
  );
  if (!page) notFound();
  return (
    <>
      <GardenHeader pageId={page.id} />
      <main className="public-page public-visual-page">
        <div
          className="page-content public-page-heading"
          style={{
            display:
              page.content.root.props.showTitle === false ? "none" : undefined,
          }}
        >
          <h1>{page.title}</h1>
        </div>
        <GardenContent
          data={page.content}
          pageId={page.id}
          pageDate={page.page_date}
        />
      </main>
      <GardenFooter />
    </>
  );
}
