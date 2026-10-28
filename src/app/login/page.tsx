import { PublicHeader } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/config";
export default function LoginPage() {
  return (
    <>
      <PublicHeader />
      <main className="auth-main">
        <p className="eyebrow">Your garden</p>
        <h1>Welcome back</h1>
        <p className="muted">A little space for the two of you.</p>
        <AuthForm mode="login" configured={isConfigured()} />
      </main>
    </>
  );
}
