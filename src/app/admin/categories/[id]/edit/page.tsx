import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/category-form";
import { requireAdministrator } from "@/lib/server/auth";
import { categories } from "@/lib/server/categories";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

const loadCategory = cache(async (id: string) => {
  await requireAdministrator();
  const list = await categories();
  const category = list.find((entry) => entry.id === id.toLowerCase());
  if (!category) notFound();
  return { list, category };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await loadCategory((await params).id);
  return { title: category.name + " · Edit category" };
}

export default async function EditCategory({ params }: Props) {
  const { list, category } = await loadCategory((await params).id);
  return (
    <CategoryForm
      key={category.id}
      id={category.id}
      category={category}
      categories={list}
    />
  );
}
