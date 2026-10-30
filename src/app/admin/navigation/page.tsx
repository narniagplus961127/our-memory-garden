import { NavigationEditor } from "@/components/navigation-editor";
import { readNavigation } from "@/lib/server/navigation";
export const dynamic = "force-dynamic";
export default async function NavigationPage() {
  return <NavigationEditor initial={await readNavigation()} />;
}
