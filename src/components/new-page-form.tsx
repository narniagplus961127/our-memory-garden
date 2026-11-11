"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { starterTemplates, type TemplateSummary } from "@/lib/page-templates";
import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addressFromTitle, validSlug } from "@/lib/page-address";
export function NewPageForm({
  savedTemplates,
}: {
  savedTemplates: TemplateSummary[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(""),
    [customSlug, setCustomSlug] = useState<string | null>(null),
    [slugError, setSlugError] = useState("");
  const slug = customSlug ?? addressFromTitle(title);
  const router = useRouter();
  const choices = [
    {
      id: "blank",
      label: "Blank page",
      description: "A quiet space to begin.",
      preview: "blank",
    },
    ...starterTemplates.flatMap((starter) => {
      const saved = savedTemplates.find(({ id }) => id === starter.id);
      return saved
        ? [
            {
              id: saved.id,
              label: saved.name,
              description:
                saved.version === 1 ? starter.description : "Saved template",
              preview: saved.version === 1 ? starter.alias : "saved",
            },
          ]
        : [];
    }),
    ...savedTemplates
      .filter(
        ({ id }) => !starterTemplates.some((starter) => starter.id === id),
      )
      .map(({ id, name }) => ({
        id,
        label: name,
        description: "Saved template",
        preview: "saved",
      })),
  ];
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validSlug(slug)) {
      setSlugError("Use 1–100 lowercase letters, numbers and single hyphens.");
      return;
    }
    setPending(true);
    setError("");
    setSlugError("");
    try {
      const form = new FormData(event.currentTarget);
      const title = form.get("title"),
        template = form.get("template");
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, template, slug }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setSlugError(result.error);
        else setError(result.error ?? "Could not create the page.");
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
      <fieldset className="template-choices" disabled={pending}>
        <legend>Start from a template</legend>
        <div className="template-grid">
          {choices.map((template) => (
            <Label className="template-card" key={template.id}>
              <Input
                type="radio"
                name="template"
                value={template.id}
                aria-label={template.label}
                defaultChecked={template.id === "blank"}
              />
              <span
                className={
                  "template-preview template-preview-" + template.preview
                }
                aria-hidden="true"
              >
                {template.preview === "blank" ? (
                  <span className="template-blank-mark">+</span>
                ) : template.preview === "saved" ? (
                  <LayoutTemplate className="mx-auto size-8 text-muted-foreground" />
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
                    {template.preview === "journal" && (
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
            </Label>
          ))}
        </div>
      </fieldset>
      <div className="field new-page-title">
        <Label htmlFor="new-title">Page title</Label>
        <Input
          id="new-title"
          name="title"
          required
          maxLength={200}
          disabled={pending}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (customSlug === null) setSlugError("");
          }}
        />
      </div>
      <div className="field new-page-url">
        <Label htmlFor="new-slug">Page URL</Label>
        <div className="page-url-input">
          <span aria-hidden="true">/garden/</span>
          <Input
            id="new-slug"
            name="slug"
            value={slug}
            required
            maxLength={100}
            disabled={pending}
            aria-describedby="new-slug-help new-slug-error"
            aria-invalid={Boolean(slugError)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              setCustomSlug(event.target.value);
              setSlugError("");
            }}
          />
        </div>
        <div className="page-url-help">
          <small id="new-slug-help" className="muted">
            Lowercase letters, numbers and hyphens. You can change this later in
            Page settings.
          </small>
          <Button
            type="button"
            className="secondary"
            disabled={pending || customSlug === null}
            onClick={() => {
              setCustomSlug(null);
              setSlugError("");
            }}
          >
            Use title
          </Button>
        </div>
        <p
          id="new-slug-error"
          role={slugError ? "alert" : undefined}
          className="error"
          hidden={!slugError}
        >
          {slugError}
        </p>
      </div>
      <div className="actions">
        <Button disabled={pending}>Create private page</Button>
        <Button asChild className="button secondary">
          <Link href="/admin/pages">Cancel</Link>
        </Button>
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
