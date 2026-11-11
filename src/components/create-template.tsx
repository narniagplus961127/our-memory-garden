"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Toast } from "./toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Source = {
  pageId: string;
  title: string;
  saved: boolean;
  version: () => number;
};

export function CreateTemplate({ source }: { source?: Source }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pageVersion, setPageVersion] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const id = useRef<string | null>(null);
  const pending = useRef(false);

  async function create() {
    if (!name.trim() || pending.current) return;
    pending.current = true;
    id.current ??= crypto.randomUUID();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id.current,
          name,
          pageId: source?.pageId,
          pageVersion,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not create the template.");
      id.current = null;
      if (source) {
        setPageVersion(null);
        setCreated(result.id);
      } else {
        router.push("/admin/templates/" + result.id);
        router.refresh();
      }
    } catch (failure) {
      setError(
        failure instanceof TypeError
          ? "Could not connect. Try again."
          : (failure as Error).message,
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const field = (
    <div className="grid gap-2">
      <Label htmlFor="new-template-name">Template name</Label>
      <Input
        id="new-template-name"
        required
        maxLength={200}
        value={name}
        disabled={busy}
        onChange={(event) => setName(event.target.value)}
      />
    </div>
  );
  if (!source)
    return (
      <form
        className="settings-card grid w-full max-w-[720px] gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        {field}
        {error && (
          <p role="alert" className="error m-0">
            {error}
          </p>
        )}
        <div className="actions">
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create template"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/templates">Cancel</Link>
          </Button>
        </div>
      </form>
    );

  return (
    <div className="settings-field">
      <Button
        type="button"
        variant="outline"
        disabled={!source.saved}
        onClick={() => {
          id.current = null;
          setName(source.title);
          setError("");
          setCreated("");
          setPageVersion(source.version());
        }}
      >
        Save as template
      </Button>
      {!source.saved && (
        <small>Wait for the page to finish saving before copying it.</small>
      )}
      {pageVersion !== null && (
        <ConfirmationDialog
          title="Save page as a template?"
          description="Copy the saved layout and text. Photos will be replaced with placeholders. The original page will remain independent."
          busy={busy}
          error={error}
          confirmLabel="Save template"
          retryLabel="Try saving again"
          confirmDisabled={!name.trim() || !source.saved}
          onConfirm={() => void create()}
          onCancel={() => setPageVersion(null)}
        >
          {field}
        </ConfirmationDialog>
      )}
      {created && (
        <Toast
          message="Template saved."
          actionLabel="Edit template"
          onAction={() => router.push("/admin/templates/" + created)}
          onDismiss={() => setCreated("")}
        />
      )}
    </div>
  );
}
