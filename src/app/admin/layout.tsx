import { requireAdministrator } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin-shell";
import { ensureHomepage } from "@/lib/server/homepage";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureHomepage(await requireAdministrator());
  return <AdminShell>{children}</AdminShell>;
}
