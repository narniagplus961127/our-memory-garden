import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { adminPageBatch } from "@/lib/server/page-list";
import { readPageListQuery, type PageSearchParams } from "@/lib/page-list";
import { AdminPageCards } from "@/components/admin-page-cards";
import { readAdminListOrder } from "@/lib/server/admin-list-order";
export const metadata = { title: "Pages" };

export default async function Pages({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  await requireAdministrator();
  const query = readPageListQuery(await searchParams);
  const [batch, order] = await Promise.all([
    adminPageBatch(query),
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
          <Button asChild variant="primary">
            <Link href="/admin/pages/new">Create page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/trash">Trash</Link>
          </Button>
        </div>
      </div>
      <AdminPageCards
        key={order.version}
        pages={batch.pages}
        paged={{ query, more: batch.more }}
        order={order}
        allowTrash
      />
    </>
  );
}
