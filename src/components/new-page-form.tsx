"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function NewPageForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const title = new FormData(event.currentTarget).get("title");
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not create the page.");
        return;
      }
      router.push("/admin/pages/" + result.id);
      router.refresh();
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return open ? (
    <form onSubmit={create} className="new-page-form">
      <div className="field">
        <label htmlFor="new-title">Page title</label>
        <input id="new-title" name="title" required maxLength={200} autoFocus />
      </div>
      <div className="actions">
        <button disabled={pending}>Create private page</button>
        <button
          type="button"
          className="secondary"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <small className="muted">
        New pages are private. Only garden administrators can see them.
      </small>
    </form>
  ) : (
    <button onClick={() => setOpen(true)}>Create page</button>
  );
}
