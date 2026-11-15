import { CategoryForm } from "@/components/category-form";
import { requireAdministrator } from "@/lib/server/auth";
import { categories } from "@/lib/server/categories";
export const dynamic = "force-dynamic";
export const metadata = { title: "Create category" };

export default async function NewCategory() {
  await requireAdministrator();
  return (
    <CategoryForm id={crypto.randomUUID()} categories={await categories()} />
  );
}
