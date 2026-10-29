import { notFound } from "next/navigation";
import { requireAdministrator } from "@/lib/server/auth";
import { getVisiblePage } from "@/lib/server/pages";
import { PageEditor } from "@/components/page-editor";
export default async function PageEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const page = await getVisiblePage(
    (await params).id,
    await requireAdministrator(),
  );
  if (!page) notFound();
  return <PageEditor page={page} />;
}
