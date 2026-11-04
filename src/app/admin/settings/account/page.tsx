import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
export default async function Account() {
  const admin = await requireAdministrator();
  return (
    <>
      <p className="eyebrow">Settings</p>
      <h1>Your account</h1>
      <p>You are signed in as {admin.email}.</p>
      <p className="muted">Both garden administrators have equal access.</p>
      <Button asChild className="button">
        <Link href="/forgot-password">Reset password by email</Link>
      </Button>
    </>
  );
}
