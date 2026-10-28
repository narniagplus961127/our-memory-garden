import { notFound } from "next/navigation";
import { requireAdministrator } from "@/lib/server/auth";
import { getVisiblePage, firstText } from "@/lib/server/pages";
import { BasicPageEditor } from "@/components/basic-page-editor";
export default async function PageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdministrator();
  const page = await getVisiblePage((await params).id, admin);
  if (!page) notFound();
  return <BasicPageEditor page={page} initialText={firstText(page.content)} />;
}
