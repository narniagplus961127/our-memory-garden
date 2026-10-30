import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listTrash } from "@/lib/server/page-recovery";
import { TrashAction } from "@/components/page-recovery";
export default async function Trash() {
  await requireAdministrator();
  const pages = await listTrash();
  return (
    <>
      <Link href="/admin/pages">← Pages</Link>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Saved for later</p>
          <h1>Trash</h1>
          <p>
            Pages stay here until you restore them or explicitly delete them
            permanently.
          </p>
        </div>
      </div>
      {pages.length ? (
        pages.map((page) => (
          <article className="trash-card" key={page.id}>
            <h2>{page.title}</h2>
            <p>
              Moved to trash{" "}
              {new Date(page.deleted_at!).toLocaleString("en-GB")}
            </p>
            <Link href={"/admin/pages/" + page.id + "/history"}>
              View saved history
            </Link>
            <TrashAction page={JSON.parse(JSON.stringify(page))} />
          </article>
        ))
      ) : (
        <p>The trash is empty.</p>
      )}
    </>
  );
}
