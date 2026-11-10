import { CreateTemplate } from "@/components/create-template";
import { requireAdministrator } from "@/lib/server/auth";

export default async function NewTemplate() {
  await requireAdministrator();
  return (
    <>
      <h1>Create template</h1>
      <p className="muted">
        Name your template and build its layout in the visual editor.
      </p>
      <CreateTemplate />
    </>
  );
}
