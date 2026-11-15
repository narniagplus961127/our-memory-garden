import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { TemplateEditor } from "@/components/template-editor";
import { requireAdministrator } from "@/lib/server/auth";
import { getPageTemplate } from "@/lib/server/page-templates";

type Props = { params: Promise<{ id: string }> };

const loadTemplate = cache(async (id: string) => {
  await requireAdministrator();
  const template = await getPageTemplate(id);
  if (!template) notFound();
  return template;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const template = await loadTemplate((await params).id);
  return { title: template.name + " · Template editor" };
}

export default async function TemplateEditorRoute({ params }: Props) {
  const template = await loadTemplate((await params).id);
  return <TemplateEditor key={template.id} template={template} />;
}
