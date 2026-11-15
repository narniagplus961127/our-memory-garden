import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/category-form";
import { requireAdministrator } from "@/lib/server/auth";
import { categories } from "@/lib/server/categories";
export const dynamic = "force-dynamic";
export default async function EditCategory({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdministrator();
  const { id } = await params;
  const list = await categories();
  const category = list.find((entry) => entry.id === id.toLowerCase());
  if (!category) notFound();
  return (
    <CategoryForm
      key={category.id}
      id={category.id}
      category={category}
      categories={list}
    />
  );
}
