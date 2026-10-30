import { GardenHeader } from "@/components/garden-header";
import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/config";
export default async function ResetPasswordPage() {
  return (
    <>
      <GardenHeader />
      <main className="auth-main">
        <h1>A fresh start</h1>
        <p className="muted">Choose a new password for your garden account.</p>
        <AuthForm mode="reset" configured={isConfigured()} />
      </main>
    </>
  );
}
