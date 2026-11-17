"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminInvitationForm() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(values)),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Could not create the invitation.");
      setUrl(result.url);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not create the invitation.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="settings-card grid max-w-xl gap-4"
      aria-labelledby="invite-admin"
    >
      <h2 id="invite-admin">Invite an administrator</h2>
      <p className="muted">
        Share the link privately. It expires after 24 hours.
      </p>
      <form
        method="post"
        action="/api/admin/invitations"
        className="grid gap-3"
        onSubmit={submit}
      >
        <div className="grid gap-2">
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" name="name" required maxLength={100} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-email">Email address</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            maxLength={254}
          />
        </div>
        <Button type="submit" className="justify-self-start" disabled={busy}>
          {busy ? "Creating invitation…" : "Create invitation"}
        </Button>
      </form>
      {url && (
        <div className="grid gap-2">
          <Label htmlFor="invite-link">Invitation link</Label>
          <Input
            id="invite-link"
            value={url}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setError("");
              } catch {
                setError("Select the invitation link and copy it manually.");
              }
            }}
          >
            Copy link
          </Button>
          {copied && <p role="status">Invitation link copied.</p>}
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
