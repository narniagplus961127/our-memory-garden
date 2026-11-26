import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { AdminInvitationForm } from "@/components/admin-invitation-form";
export const metadata = { title: "Your account" };

export default async function Account() {
  const admin = await requireAdministrator();
  return (
    <>
      <p className="eyebrow">Settings</p>
      <h1>Your account</h1>
      <p>You are signed in as {admin.email}.</p>
      <Button asChild variant="primary" className="button">
        <Link href="/forgot-password">Reset password by email</Link>
      </Button>
      <div className="mt-8">
        <AdminInvitationForm />
      </div>
    </>
  );
}
