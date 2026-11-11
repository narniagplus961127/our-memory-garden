"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { equal } from "@/lib/page-merge";
import { templatePlaceholders, type PageTemplate } from "@/lib/page-templates";
import { GardenEditor } from "./page-editor";

type Draft = Pick<PageTemplate, "name" | "content">;

export function TemplateEditor({ template }: { template: PageTemplate }) {
  const [saved, setSaved] = useState(() => ({
    ...template,
    content: templatePlaceholders(template.content),
  }));
  const [draft, setDraft] = useState<Draft>({
    name: template.name,
    content: saved.content,
  });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{
    draft: Draft;
    message: string;
    conflict: boolean;
  } | null>(null);
  const pending = useRef(false);
  const dirty =
    draft.name !== saved.name || !equal(draft.content, saved.content);
  const error =
    failure && (failure.conflict || failure.draft === draft)
      ? failure.message
      : "";
  useEffect(() => {
    if (!dirty && !busy) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, dirty]);

  const save = useCallback(async () => {
    if (pending.current || !dirty || !draft.name.trim()) return;
    pending.current = true;
    setBusy(true);
    setFailure(null);
    const submitted = draft;
    let conflict = false;
    try {
      const response = await fetch("/api/templates/" + template.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submitted, version: saved.version }),
      });
      const result = await response.json();
      if (!response.ok) {
        conflict = response.status === 409;
        throw new Error(result.error ?? "Could not save the template.");
      }
      setSaved(result);
      setDraft((current) =>
        current === submitted
          ? { name: result.name, content: result.content }
          : current,
      );
    } catch (cause) {
      setFailure({
        draft: submitted,
        conflict,
        message:
          cause instanceof Error && !(cause instanceof TypeError)
            ? cause.message
            : "Could not connect. Try again.",
      });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, [dirty, draft, saved.version, template.id]);

  useEffect(() => {
    if (!dirty || busy || error || !draft.name.trim()) return;
    const timer = window.setTimeout(() => void save(), 650);
    return () => window.clearTimeout(timer);
  }, [busy, dirty, draft.name, error, save]);

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
        status: busy
          ? "Saving…"
          : error
            ? "Not saved"
            : !dirty
              ? "Saved"
              : !draft.name.trim()
                ? "Enter a name to save"
                : "Saving…",
        error,
        retry: error && !failure?.conflict ? () => void save() : undefined,
        canLeave: () =>
          (!dirty && !busy) ||
          window.confirm("Leave before your template changes finish saving?"),
        onMetadata: ({ title, content }) =>
          setDraft((current) => ({
            name: title ?? current.name,
            content: content ?? current.content,
          })),
      }}
    />
  );
}
