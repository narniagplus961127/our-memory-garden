import { GardenHeader } from "@/components/garden-header";
import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/config";
export default async function ForgotPasswordPage() {
  return (
    <>
      <GardenHeader />
      <main className="auth-main">
        <h1>Reset your password</h1>
        <p className="muted">
          Enter your account email to receive a reset link.
        </p>
        <AuthForm mode="forgot" configured={isConfigured()} />
      </main>
    </>
  );
}
