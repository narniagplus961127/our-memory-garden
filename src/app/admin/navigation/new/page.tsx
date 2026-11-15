import { NavigationItemForm } from "@/components/navigation-item-form";
import { requireAdministrator } from "@/lib/server/auth";
import { readNavigation } from "@/lib/server/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Add menu item" };

export default async function NewNavigationItem() {
  await requireAdministrator();
  return (
    <NavigationItemForm
      initial={await readNavigation()}
      id={crypto.randomUUID()}
    />
  );
}
