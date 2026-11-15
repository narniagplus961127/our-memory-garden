import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { NavigationItemForm } from "@/components/navigation-item-form";
import { requireAdministrator } from "@/lib/server/auth";
import { readNavigation } from "@/lib/server/navigation";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

const loadMenuItem = cache(async (id: string) => {
  await requireAdministrator();
  const initial = await readNavigation();
  const item = initial.items.find((entry) => entry.id === id);
  if (!item) notFound();
  return { initial, item };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { item } = await loadMenuItem((await params).id);
  return { title: item.label + " · Edit menu item" };
}

export default async function EditNavigationItem({ params }: Props) {
  const { id } = await params;
  const { initial, item } = await loadMenuItem(id);
  return <NavigationItemForm key={id} initial={initial} item={item} id={id} />;
}
