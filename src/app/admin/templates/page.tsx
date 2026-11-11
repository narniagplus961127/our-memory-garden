import Link from "next/link";
import { TemplateList } from "@/components/template-list";
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
      <TemplateList templates={templates} />
    </>
  );
}
