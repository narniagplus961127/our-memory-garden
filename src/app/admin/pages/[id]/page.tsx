import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireAdministrator } from "@/lib/server/auth";
import { getVisiblePage } from "@/lib/server/pages";
import { PageEditor } from "@/components/page-editor";
type Props = { params: Promise<{ id: string }> };

const loadPage = cache(async (id: string) => {
  const administrator = await requireAdministrator();
  const page = await getVisiblePage(id, administrator);
  if (!page) notFound();
  return { page, administrator };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await loadPage((await params).id);
  return { title: page.title + " · Page editor" };
}

export default async function PageEditorRoute({ params }: Props) {
  const { page, administrator } = await loadPage((await params).id);
  return (
    <PageEditor
      key={administrator.id + ":" + page.id}
      page={page}
      accountId={administrator.id}
    />
  );
}
