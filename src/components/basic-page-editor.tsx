"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import type { GardenPage } from "@/lib/pages";
export function BasicPageEditor({
  page,
  initialText,
}: {
  page: GardenPage;
  initialText: string;
}) {
  const [title, setTitle] = useState(page.title);
  const [text, setText] = useState(initialText);
  const [visibility, setVisibility] = useState(page.visibility);
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const version = useRef(page.version);
  const queued = useRef<{
    title: string;
    text: string;
    visibility: GardenPage["visibility"];
  } | null>(null);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function persist() {
    if (saving.current || !queued.current) return;
    const changes = queued.current;
    queued.current = null;
    saving.current = true;
    setStatus("Saving…");
    let failed = false;
    try {
      const response = await fetch("/api/pages/" + page.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...changes, version: version.current }),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error ?? "Could not save.");
      version.current = saved.version;
      setError("");
      setStatus("Saved");
    } catch (error) {
      failed = true;
      queued.current ??= changes;
      setStatus("Not saved");
      setError(error instanceof Error ? error.message : "Could not save.");
    } finally {
      saving.current = false;
      if (queued.current && !failed) void persist();
    }
  }
  function changed(
    nextTitle: string,
    nextText: string,
    nextVisibility = visibility,
  ) {
    queued.current = {
      title: nextTitle,
      text: nextText,
      visibility: nextVisibility,
    };
    setStatus("Saving…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!nextTitle.trim()) {
        setStatus("Not saved");
        setError("Enter a page title.");
        return;
      }
      void persist();
    }, 650);
  }
  return (
    <div className="page-editor">
      <div className="editor-toolbar">
        <Link href="/admin/pages">← Pages</Link>
        <div className="actions">
          <div className="visibility-control">
            <label className="visually-hidden" htmlFor="page-visibility">
              Page visibility
            </label>
            <select
              id="page-visibility"
              value={visibility}
              disabled={page.is_homepage}
              onChange={(event) => {
                const next =
                  event.target.value === "public" ? "public" : "private";
                setVisibility(next);
                changed(title, text, next);
              }}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>
          {page.is_homepage && (
            <span className="badge">Homepage · always public</span>
          )}
          <span role="status">{status}</span>
          <Link className="button secondary" href={"/p/" + page.id}>
            View page
          </Link>
        </div>
      </div>
      <div className="basic-editor">
        <div className="field">
          <label htmlFor="page-title">Page title</label>
          <input
            id="page-title"
            value={title}
            maxLength={200}
            onChange={(event) => {
              setTitle(event.target.value);
              changed(event.target.value, text);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="page-text">Page text</label>
          <textarea
            id="page-text"
            value={text}
            rows={12}
            maxLength={100000}
            onChange={(event) => {
              setText(event.target.value);
              changed(title, event.target.value);
            }}
          />
        </div>
        <p className="muted">
          <small>
            Changes save automatically.{" "}
            {visibility === "public"
              ? "Saved changes are visible to visitors."
              : "Only garden administrators can see this page."}
          </small>
        </p>
        {error && (
          <div role="alert">
            <p className="error">{error}</p>
            <button
              onClick={() => {
                setError("");
                void persist();
              }}
            >
              Retry save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
