import { PublicHeader } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/config";
export default function ForgotPasswordPage() {
  return (
    <>
      <PublicHeader />
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
