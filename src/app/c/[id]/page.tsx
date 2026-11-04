import { notFound, redirect } from "next/navigation";
import { categoryById } from "@/lib/server/categories";
export const dynamic = "force-dynamic";
export default async function CategoryLink({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const category = await categoryById((await params).id);
  if (!category) notFound();
  redirect("/category/" + category.slug);
}
