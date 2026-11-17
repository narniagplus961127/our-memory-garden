"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Stage = "password" | "code" | "done";

async function submitInvitation(
  token: string,
  action: string,
  values?: Record<string, string>,
) {
  const response = await fetch("/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action, ...values }),
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(result.error ?? "Could not open the invitation.");
  return result;
}

export function AdminInvitationAccept() {
  const [details, setDetails] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [stage, setStage] = useState<Stage>("password");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const fromLink = window.location.hash.slice(1);
    setToken(fromLink);
    void submitInvitation(fromLink, "details")
      .then((result) => {
        if (!active) return;
        setDetails({ email: result.email, name: result.name });
        setStage(result.stage);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function perform(action: string, values?: Record<string, string>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await submitInvitation(token, action, values);
      if (result.stage) setStage(result.stage);
      if (result.message) setNotice(result.message);
      if (result.stage === "done") {
        setToken("");
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = stage === "password" ? "password" : "code";
    const value = String(new FormData(event.currentTarget).get(key) ?? "");
    void perform(stage === "password" ? "start" : "verify", { [key]: value });
  }

  if (!details)
    return error ? (
      <div className="grid gap-4">
        <p className="error" role="alert">
          {error}
        </p>
        <Link href="/login">Back to sign in</Link>
      </div>
    ) : (
      <p role="status">Checking your invitation…</p>
    );
  if (stage === "done")
    return (
      <div className="grid gap-4">
        <p role="status">Your garden access is ready.</p>
        <Button asChild className="justify-self-start">
          <Link href="/login">Continue to sign in</Link>
        </Button>
      </div>
    );
  return (
    <div className="grid gap-4">
      <p>
        Welcome, {details.name}. This invitation is for{" "}
        <strong>{details.email}</strong>.
      </p>
      <form
        key={stage}
        method="post"
        action="/api/invitations"
        onSubmit={submit}
      >
        <fieldset disabled={busy} className="auth-fields">
          <div className="field">
            {stage === "password" ? (
              <>
                <Label htmlFor="invite-password">Choose a password</Label>
                <Input
                  id="invite-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
                <small className="muted">
                  Use at least 12 characters. If you already chose a password
                  for this invitation, enter the same one.
                </small>
              </>
            ) : (
              <>
                <Label htmlFor="invite-code">Email verification code</Label>
                <Input
                  id="invite-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </>
            )}
          </div>
          <div className="actions">
            <Button type="submit">
              {stage === "password" ? "Continue" : "Verify and accept"}
            </Button>
            {stage === "code" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void perform("resend")}
              >
                Resend code
              </Button>
            )}
          </div>
        </fieldset>
      </form>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
