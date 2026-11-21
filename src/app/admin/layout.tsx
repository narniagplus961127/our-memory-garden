import { requireAdministrator } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin-shell";
import { ensureHomepage } from "@/lib/server/homepage";
import { PhotoUploadAccount } from "@/components/photo-uploads";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const administrator = await requireAdministrator();
  await ensureHomepage(administrator);
  return (
    <PhotoUploadAccount accountId={administrator.id}>
      <AdminShell accountId={administrator.id}>{children}</AdminShell>
    </PhotoUploadAccount>
  );
}
