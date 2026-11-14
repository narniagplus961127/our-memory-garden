import Link from "next/link";
import { CopyPageForm } from "@/components/copy-page-form";
import { requireAdministrator } from "@/lib/server/auth";
import { listPages } from "@/lib/server/pages";

export default async function CopyPage() {
  const admin = await requireAdministrator();
  const pages = (await listPages(admin)).map(
    ({ id, title, slug, visibility }) => ({
      id,
      title,
      slug,
      visibility,
    }),
  );
  return (
    <>
      <div className="mb-5">
        <Link href="/admin/pages">‹ Pages</Link>
      </div>
      <div className="admin-heading">
        <div>
          <h1>Copy from page</h1>
          <p className="muted">
            Start a private page using an existing page’s content and photos.
          </p>
        </div>
      </div>
      <CopyPageForm pages={pages} />
    </>
  );
}
