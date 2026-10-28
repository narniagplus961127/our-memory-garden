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
      <main className="page-content">
        <h1>{page.title}</h1>
        {page.content.content
          .filter((block) => block.type === "Text")
          .map((block) => (
            <p className="text-block" key={block.props.id}>
              {typeof block.props.text === "string" ? block.props.text : ""}
            </p>
          ))}
      </main>
    </>
  );
}
