import { StorageSettings } from "@/components/storage-settings";
import { requireAdministrator } from "@/lib/server/auth";
export const metadata = { title: "Storage" };

export default async function StoragePage() {
  await requireAdministrator();
  return <StorageSettings />;
}
