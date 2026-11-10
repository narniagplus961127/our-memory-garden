import { requireAdministrator } from "@/lib/server/auth";
import { NewPageForm } from "@/components/new-page-form";
import { listPageTemplates } from "@/lib/server/page-templates";
export default async function Templates() {
  await requireAdministrator();
  return (
    <>
      <p className="eyebrow">The garden dashboard</p>
      <h1>Start a new page</h1>
      <p className="muted">
        Choose a starting point. You can change everything later.
      </p>
      <NewPageForm customTemplates={await listPageTemplates()} />
    </>
  );
}
