import { notFound, redirect } from "next/navigation";
import { currentAdministrator } from "@/lib/server/auth";
import { getVisiblePage } from "@/lib/server/pages";
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
  redirect("/garden/" + page.slug);
}
