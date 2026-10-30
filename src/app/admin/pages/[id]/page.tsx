import { notFound } from "next/navigation";
import { requireAdministrator } from "@/lib/server/auth";
import { getVisiblePage } from "@/lib/server/pages";
import { PageEditor } from "@/components/page-editor";
export default async function PageEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const administrator = await requireAdministrator();
  const page = await getVisiblePage((await params).id, administrator);
  if (!page) notFound();
  return <PageEditor key={page.id} page={page} accountId={administrator.id} />;
}
