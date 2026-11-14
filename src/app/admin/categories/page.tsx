import { requireAdministrator } from "@/lib/server/auth";
import { categories } from "@/lib/server/organization";
import { CategoryManager } from "@/components/category-manager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { readAdminListOrder } from "@/lib/server/admin-list-order";

export default async function Categories() {
  await requireAdministrator();
  const [list, order] = await Promise.all([
    categories(),
    readAdminListOrder("categories"),
  ]);
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
        initialCategories={list}
        order={order}
      />
    </>
  );
}
