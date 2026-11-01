import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listTrash } from "@/lib/server/page-recovery";
import { TrashList } from "@/components/page-recovery";
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
      <TrashList pages={JSON.parse(JSON.stringify(pages))} />
    </>
  );
}
