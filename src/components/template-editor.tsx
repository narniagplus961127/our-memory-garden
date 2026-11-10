"use client";
import { useEffect, useRef, useState } from "react";
import { equal } from "@/lib/page-merge";
import type { PageTemplate } from "@/lib/page-templates";
import { GardenEditor } from "./page-editor";
import { Button } from "./ui/button";

export function TemplateEditor({ template }: { template: PageTemplate }) {
  const [saved, setSaved] = useState(template);
  const [draft, setDraft] = useState({
    name: template.name,
    content: template.content,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const dirty =
    draft.name !== saved.name || !equal(draft.content, saved.content);
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (pending.current || !dirty || !draft.name.trim()) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const submitted = draft;
    try {
      const response = await fetch("/api/templates/" + template.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submitted, version: saved.version }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not save the template.");
      setSaved(result);
      setDraft((current) =>
        current === submitted
          ? { name: result.name, content: result.content }
          : current,
      );
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

  return (
    <GardenEditor
      initialContent={template.content}
      onContent={(content) =>
        setDraft((current) =>
          equal(current.content, content) ? current : { ...current, content },
        )
      }
      workspace={{
        title: draft.name,
        content: draft.content,
        status: busy ? "Saving…" : dirty ? "Unsaved changes" : "Saved",
        error,
        retry: () => void save(),
        canLeave: () =>
          !dirty ||
          window.confirm("Leave without saving your template changes?"),
        onMetadata: ({ title, content }) =>
          setDraft((current) => ({
            name: title ?? current.name,
            content: content ?? current.content,
          })),
        templateActions: (
          <Button
            type="button"
            className="editor-view-link"
            disabled={!dirty || !draft.name.trim() || busy}
            onClick={() => void save()}
          >
            Save template
          </Button>
        ),
      }}
    />
  );
}
