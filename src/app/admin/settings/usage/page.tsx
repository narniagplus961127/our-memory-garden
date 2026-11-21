import { UsageSettings } from "@/components/usage-settings";
import { requireAdministrator } from "@/lib/server/auth";
export const metadata = { title: "Usage & alerts" };
export default async function UsagePage() {
  await requireAdministrator();
  return <UsageSettings />;
}
