import { connection } from "next/server";
import { PublicHeader } from "./brand";
import { publicNavigation } from "@/lib/server/navigation";
import { isConfigured } from "@/lib/config";
export async function GardenHeader() {
  await connection();
  return (
    <PublicHeader items={isConfigured() ? await publicNavigation() : []} />
  );
}
