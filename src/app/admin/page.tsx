import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listPages } from "@/lib/server/pages";
import { AdminPageCards } from "@/components/admin-page-cards";
import { pageCardData } from "@/lib/pages";
export default async function Dashboard() {
  const pages = await listPages(await requireAdministrator());
  return (
    <>
      <p className="eyebrow">The garden dashboard</p>
      <h1>Hello, gardeners</h1>
      <p className="muted">Your little corner is growing beautifully.</p>
      <Link className="button" href="/admin/pages/new">
        Create a page
      </Link>
      <section className="overview-pages" aria-labelledby="your-pages">
        <div className="section-heading">
          <h2 id="your-pages">Your pages</h2>
          <Link href="/admin/pages">Manage pages</Link>
        </div>
        {pages.length ? (
          <AdminPageCards pages={pages.slice(0, 5).map(pageCardData)} />
        ) : (
          <div className="empty-state">
            <h3>Your first page starts here</h3>
            <p className="muted">
              Create a private page and give a memory a place to grow.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
