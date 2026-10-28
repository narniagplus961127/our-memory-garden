import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listPages } from "@/lib/server/pages";
export default async function Dashboard() {
  const admin = await requireAdministrator();
  const pages = await listPages(admin);
  return (
    <>
      <p className="eyebrow">Your garden</p>
      <h1>A little room to grow</h1>
      <p className="muted">Welcome back. Keep the moments that matter.</p>
      <p>
        {pages.length} {pages.length === 1 ? "page" : "pages"} in your garden
      </p>
      <Link className="button" href="/admin/pages">
        Manage pages
      </Link>
    </>
  );
}
