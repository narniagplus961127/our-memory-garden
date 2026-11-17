import type { Metadata } from "next";
import { AdminInvitationAccept } from "@/components/admin-invitation-accept";

export const metadata: Metadata = {
  title: "Garden invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function InvitePage() {
  return (
    <main className="auth-main">
      <h1>Garden invitation</h1>
      <AdminInvitationAccept />
    </main>
  );
}
