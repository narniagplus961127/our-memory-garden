import { CategoryForm } from "@/components/category-form";
import { requireAdministrator } from "@/lib/server/auth";
export const dynamic = "force-dynamic";
export default async function NewCategory() {
  await requireAdministrator();
  return <CategoryForm id={crypto.randomUUID()} />;
}
