import { requireAdministrator } from "@/lib/server/auth";
import { readCategoryTree } from "@/lib/server/categories";
import { CategoryManager } from "@/components/category-manager";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Categories() {
  await requireAdministrator();
  const { items, order } = await readCategoryTree();
  return (
    <>
      <div className="admin-heading admin-list-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1 id="categories-title" tabIndex={-1}>
            Categories
          </h1>
          <p className="muted">
            Organize your pages into places, occasions and chapters.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/categories/new">Create category</Link>
        </Button>
      </div>
      <CategoryManager
        key={order.version}
        initialCategories={items}
        order={order}
      />
    </>
  );
}
