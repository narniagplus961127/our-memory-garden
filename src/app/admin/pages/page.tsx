import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listPages } from "@/lib/server/pages";
import { AdminPageCards } from "@/components/admin-page-cards";
import { pageCardData } from "@/lib/pages";
import { readAdminListOrder } from "@/lib/server/admin-list-order";
export default async function Pages() {
  const admin = await requireAdministrator();
  const [pages, order] = await Promise.all([
    listPages(admin),
    readAdminListOrder("pages"),
  ]);
  return (
    <>
      <div className="admin-heading admin-list-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1 id="pages-title" tabIndex={-1}>
            Pages
          </h1>
          <p className="muted">Manage and organize your pages.</p>
        </div>
        <div className="admin-list-heading-actions">
          <Button asChild>
            <Link href="/admin/pages/new">Create page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/trash">Trash</Link>
          </Button>
        </div>
      </div>
      <AdminPageCards
        key={order.version}
        pages={pages.map(pageCardData)}
        order={order}
        allowTrash
      />
    </>
  );
}
