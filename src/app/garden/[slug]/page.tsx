import { GardenContent } from "@/components/garden-content";
import { GardenHeader } from "@/components/garden-header";
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
      <GardenHeader />
      <main className="public-page">
        <div className="page-content">
          <h1>{page.title}</h1>
        </div>
        <GardenContent data={page.content} />
      </main>
    </>
  );
}
