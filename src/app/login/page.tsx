import { GardenHeader } from "@/components/garden-header";
import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/config";
import { currentAdministrator } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
export default async function LoginPage() {
  await connection();
  if (await currentAdministrator()) redirect("/admin");
  return (
    <>
      <GardenHeader />
      <main className="auth-main">
        <p className="eyebrow">Your garden</p>
        <h1>Welcome back</h1>
        <p className="muted">A little space for the two of you.</p>
        <AuthForm mode="login" configured={isConfigured()} />
      </main>
    </>
  );
}
