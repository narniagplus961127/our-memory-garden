import { GardenContent } from "@/components/garden-content";
import { notFound } from "next/navigation";
import { currentAdministrator } from "@/lib/server/auth";
import { getVisiblePage } from "@/lib/server/pages";
import { PublicHeader } from "@/components/brand";
export const dynamic = "force-dynamic";
export default async function PageView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const page = await getVisiblePage(
    (await params).id,
    await currentAdministrator(),
  );
  if (!page) notFound();
  return (
    <>
      <PublicHeader />
      <main className="public-page">
        <div className="page-content">
          <h1>{page.title}</h1>
        </div>
        <GardenContent data={page.content} />
      </main>
    </>
  );
}
