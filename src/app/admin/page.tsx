import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listPageCards } from "@/lib/server/pages";
import { AdminPageCards } from "@/components/admin-page-cards";
export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const pages = await listPageCards(await requireAdministrator(), 5);
  return (
    <>
      <section
        className="garden-welcome"
        aria-labelledby="garden-welcome-title"
      >
        <div className="garden-welcome-copy">
          <p className="eyebrow">The garden dashboard</p>
          <h1 id="garden-welcome-title">Hello, gardeners</h1>
          <p className="muted">Your little corner is growing beautifully.</p>
          <Button asChild className="button primary">
            <Link href="/admin/pages/new">Create a page</Link>
          </Button>
        </div>
        <img
          className="garden-welcome-art"
          src="/brand/garden-panorama-small-v2.webp"
          srcSet="/brand/garden-panorama-small-v2.webp 960w, /brand/garden-panorama-v2.webp 1920w"
          sizes="(max-width: 760px) 100vw, 44vw"
          alt=""
          width={1920}
          height={640}
        />
      </section>
      <section className="overview-pages" aria-labelledby="your-pages">
        <div className="section-heading">
          <h2 id="your-pages">Your pages</h2>
          <Link href="/admin/pages">Manage pages</Link>
        </div>
        {pages.length ? (
          <AdminPageCards pages={pages} />
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
