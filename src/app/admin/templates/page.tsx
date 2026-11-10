import Link from "next/link";
import { AdminListRow } from "@/components/admin-list-row";
import { Button } from "@/components/ui/button";
import { requireAdministrator } from "@/lib/server/auth";
import { listPageTemplates } from "@/lib/server/page-templates";

export default async function Templates() {
  await requireAdministrator();
  const templates = await listPageTemplates();
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1>Templates</h1>
          <p className="muted">
            Create reusable starting points for new pages.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/templates/new">Create template</Link>
        </Button>
      </div>
      {templates.length ? (
        <ul className="admin-list">
          {templates.map(({ id, name }) => (
            <li key={id}>
              <AdminListRow title={name} href={"/admin/templates/" + id} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>No saved templates yet</h2>
          <p>Create one here or save a layout from Page settings.</p>
        </div>
      )}
    </>
  );
}
