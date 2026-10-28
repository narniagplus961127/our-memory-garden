import { requireAdministrator } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin-shell";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdministrator();
  return <AdminShell>{children}</AdminShell>;
}
