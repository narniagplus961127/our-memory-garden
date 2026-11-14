import { requireAdministrator } from "@/lib/server/auth";
import { NewPageForm } from "@/components/new-page-form";
import { listPageTemplates } from "@/lib/server/page-templates";
import { readAdminListOrder } from "@/lib/server/admin-list-order";
import { applyAdminListOrder } from "@/lib/admin-list-order";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default async function Templates() {
  await requireAdministrator();
  const [templates, order] = await Promise.all([
    listPageTemplates(),
    readAdminListOrder("templates"),
  ]);
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">The garden dashboard</p>
          <h1>Start a new page</h1>
          <p className="muted">
            Choose a starting point. You can change everything later.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/templates">Manage templates</Link>
        </Button>
      </div>
      <NewPageForm savedTemplates={applyAdminListOrder(templates, order.ids)} />
    </>
  );
}
