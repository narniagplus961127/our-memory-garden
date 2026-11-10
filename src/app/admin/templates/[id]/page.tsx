import { notFound } from "next/navigation";
import { TemplateEditor } from "@/components/template-editor";
import { requireAdministrator } from "@/lib/server/auth";
import { getPageTemplate } from "@/lib/server/page-templates";

export default async function TemplateEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdministrator();
  const template = await getPageTemplate((await params).id);
  if (!template) notFound();
  return <TemplateEditor key={template.id} template={template} />;
}
