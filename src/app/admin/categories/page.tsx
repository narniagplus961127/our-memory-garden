import { requireAdministrator } from "@/lib/server/auth";
import { categories } from "@/lib/server/organization";
import { CategoryManager } from "@/components/category-manager";

export default async function Categories() {
  await requireAdministrator();
  const list = await categories();
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1>Categories</h1>
          <p className="muted">
            Organize your pages into places, occasions and chapters.
          </p>
        </div>
      </div>
      <CategoryManager initialCategories={list} />
    </>
  );
}
