import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/category-form";
import { requireAdministrator } from "@/lib/server/auth";
import { categoryById } from "@/lib/server/categories";
export const dynamic = "force-dynamic";
export default async function EditCategory({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdministrator();
  const category = await categoryById((await params).id);
  if (!category) notFound();
  return (
    <CategoryForm key={category.id} id={category.id} category={category} />
  );
}
