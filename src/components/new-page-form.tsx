"use client";
import { templates } from "@/lib/blocks";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function NewPageForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const title = form.get("title"),
        template = form.get("template");
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, template }),
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
  return (
    <form onSubmit={create} className="new-page-form">
      <fieldset className="template-choices">
        <legend>Start from a template</legend>
        <div className="template-grid">
          {templates.map((template) => (
            <label className="template-card" key={template.id}>
              <input
                type="radio"
                name="template"
                value={template.id}
                aria-label={template.label}
                defaultChecked={template.id === "blank"}
              />
              <span
                className={"template-preview template-preview-" + template.id}
                aria-hidden="true"
              >
                {template.id === "blank" ? (
                  <span className="template-blank-mark">+</span>
                ) : (
                  <>
                    <span className="template-mini-banner" />
                    <span className="template-mini-content">
                      <span className="template-mini-lines">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="template-mini-photo">❧</span>
                    </span>
                    {template.id === "journal" && (
                      <span className="template-mini-lines">
                        <i />
                        <i />
                      </span>
                    )}
                  </>
                )}
              </span>
              <span className="template-name">{template.label}</span>
              <span className="template-description">
                {template.description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field new-page-title">
        <label htmlFor="new-title">Page title</label>
        <input id="new-title" name="title" required maxLength={200} />
      </div>
      <div className="actions">
        <button disabled={pending}>Create private page</button>
        <Link className="button secondary" href="/admin/pages">
          Cancel
        </Link>
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
  );
}
