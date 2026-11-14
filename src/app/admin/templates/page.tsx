import Link from "next/link";
import { TemplateList } from "@/components/template-list";
import { Button } from "@/components/ui/button";
import { requireAdministrator } from "@/lib/server/auth";
import { listPageTemplates } from "@/lib/server/page-templates";
import { readAdminListOrder } from "@/lib/server/admin-list-order";

export default async function Templates() {
  await requireAdministrator();
  const [templates, order] = await Promise.all([
    listPageTemplates(),
    readAdminListOrder("templates"),
  ]);
  return (
    <>
      <div className="admin-heading admin-list-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1 id="templates-title" tabIndex={-1}>
            Templates
          </h1>
          <p className="muted">
            Create reusable starting points for new pages.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/templates/new">Create template</Link>
        </Button>
      </div>
      <TemplateList key={order.version} templates={templates} order={order} />
    </>
  );
}
