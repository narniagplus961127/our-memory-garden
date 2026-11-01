import { ExportSettings } from "@/components/backup-settings";
import { requireAdministrator } from "@/lib/server/auth";
export default async function ExportPage() {
  await requireAdministrator();
  return <ExportSettings />;
}
