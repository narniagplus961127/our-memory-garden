import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listPages } from "@/lib/server/pages";
import { AdminPageCards } from "@/components/admin-page-cards";
import { pageCardData } from "@/lib/pages";
export default async function Pages() {
  const pages = await listPages(await requireAdministrator());
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1 id="pages-title" tabIndex={-1}>
            Pages
          </h1>
          <p className="muted">Manage and organize your pages.</p>
        </div>
      </div>
      <div className="actions create-page-link">
        <Button asChild className="button">
          <Link href="/admin/pages/new">Create page</Link>
        </Button>
        <Button asChild className="button secondary">
          <Link href="/admin/trash">Trash</Link>
        </Button>
      </div>
      <AdminPageCards pages={pages.map(pageCardData)} allowTrash />
    </>
  );
}
