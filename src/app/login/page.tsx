import { GardenHeader } from "@/components/garden-header";
import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/config";
export default async function LoginPage() {
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
