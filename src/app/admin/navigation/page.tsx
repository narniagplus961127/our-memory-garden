import { NavigationEditor } from "@/components/navigation-editor";
import { readNavigation } from "@/lib/server/navigation";
import { requireAdministrator } from "@/lib/server/auth";
export const dynamic = "force-dynamic";
export default async function NavigationPage() {
  await requireAdministrator();
  const initial = await readNavigation();
  return <NavigationEditor key={initial.version} initial={initial} />;
}
