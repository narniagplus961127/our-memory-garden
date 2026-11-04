import { notFound } from "next/navigation";
import { NavigationItemForm } from "@/components/navigation-item-form";
import { requireAdministrator } from "@/lib/server/auth";
import { readNavigation } from "@/lib/server/navigation";
export const dynamic = "force-dynamic";
export default async function EditNavigationItem({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdministrator();
  const { id } = await params,
    initial = await readNavigation(),
    item = initial.items.find((entry) => entry.id === id);
  if (!item) notFound();
  return <NavigationItemForm key={id} initial={initial} item={item} id={id} />;
}
