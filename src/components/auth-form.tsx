"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
type AuthMode = "login" | "forgot" | "reset";
export function AuthForm({
  mode,
  configured,
}: {
  mode: AuthMode;
  configured: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setFailed(false);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(
        "/api/auth/" +
          (mode === "login"
            ? "sign-in/email"
            : mode === "forgot"
              ? "request-password-reset"
              : "reset-password"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "reset"
              ? {
                  token: new URLSearchParams(window.location.search).get(
                    "token",
                  ),
                  newPassword: values.password,
                }
              : values,
          ),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setFailed(true);
        setMessage(result.message ?? result.error ?? "Please try again.");
        return;
      }
      if (mode === "login") {
        router.push("/admin/pages");
        router.refresh();
      } else if (mode === "reset") {
        setMessage("Your password has been updated. You can sign in now.");
      } else {
        setMessage(
          "If this address belongs to a garden administrator, a reset link will arrive shortly.",
        );
      }
    } catch {
      setFailed(true);
      setMessage("Could not connect. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      {!configured && (
        <p className="error" role="status">
          The garden is being set up. Sign in will be available once the server
          is connected.
        </p>
      )}
      <form onSubmit={submit}>
        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
        )}
        {mode !== "forgot" && (
          <div className="field">
            <label htmlFor="password">
              {mode === "reset" ? "New password" : "Password"}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "reset" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "reset" ? 12 : 1}
              maxLength={128}
            />
            {mode === "reset" && (
              <small className="muted">Use at least 12 characters.</small>
            )}
          </div>
        )}
        <button disabled={pending || !configured} type="submit">
          {pending
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "forgot"
                ? "Send reset link"
                : "Set password"}
        </button>
        <p
          role={failed ? "alert" : "status"}
          className={"form-message" + (failed ? " error" : "")}
        >
          {message}
        </p>
        {mode === "login" ? (
          <Link href="/forgot-password">Forgot your password?</Link>
        ) : (
          <Link href="/login">Back to sign in</Link>
        )}
      </form>
    </>
  );
}
