import { connection } from "next/server";
import { PublicHeader } from "./brand";
import { publicNavigation } from "@/lib/server/navigation";
import { isConfigured } from "@/lib/config";
import { currentAdministrator } from "@/lib/server/auth";
export async function GardenHeader({ pageId }: { pageId?: string } = {}) {
  await connection();
  const configured = isConfigured();
  const [items, admin] = await Promise.all([
    configured ? publicNavigation() : [],
    configured ? currentAdministrator() : null,
  ]);
  return <PublicHeader items={items} editPageId={admin ? pageId : undefined} />;
}
