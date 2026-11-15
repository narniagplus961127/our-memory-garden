import { StorageSettings } from "@/components/backup-settings";
import { requireAdministrator } from "@/lib/server/auth";
export const metadata = { title: "Storage" };

export default async function StoragePage() {
  await requireAdministrator();
  return <StorageSettings />;
}
