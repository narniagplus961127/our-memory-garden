import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listPages } from "@/lib/server/pages";
import { AdminPageCards } from "@/components/admin-page-cards";
export default async function Pages() {
  const pages = await listPages(await requireAdministrator());
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1>Pages</h1>
          <p className="muted">Manage and organize your pages.</p>
        </div>
      </div>
      <div className="actions create-page-link">
        <Link className="button" href="/admin/pages/new">
          Create page
        </Link>
        <Link className="button secondary" href="/admin/trash">
          Trash
        </Link>
      </div>
      {pages.length ? (
        <AdminPageCards pages={pages} />
      ) : (
        <div className="empty-state">
          <h2>Your first page starts here</h2>
          <p className="muted">
            Create a private page and give a memory a place to grow.
          </p>
        </div>
      )}
    </>
  );
}
