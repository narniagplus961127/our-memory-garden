"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addressFromTitle, validSlug } from "@/lib/page-address";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";

type SourcePage = {
  id: string;
  title: string;
  slug: string;
  visibility: "private" | "public";
};

export function CopyPageForm({ pages }: { pages: SourcePage[] }) {
  const [sourceId, setSourceId] = useState("");
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [slugError, setSlugError] = useState("");
  const requestId = useRef("");
  const active = useRef(false);
  const router = useRouter();
  const slug = customSlug ?? addressFromTitle(title);

  function chooseSource(id: string) {
    const source = pages.find((item) => item.id === id);
    if (!source) return;
    setSourceId(id);
    setTitle(source.title.slice(0, 193) + " (copy)");
    setCustomSlug(null);
    setSlugError("");
    setError("");
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || !sourceId || !title.trim()) return;
    if (!validSlug(slug)) {
      setSlugError("Use 1–100 lowercase letters, numbers and single hyphens.");
      return;
    }
    active.current = true;
    requestId.current ||= crypto.randomUUID();
    setPending(true);
    setError("");
    setSlugError("");
    try {
      const response = await fetch("/api/pages/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          title,
          slug,
          requestId: requestId.current,
        }),
      });
      if (response.ok) {
        const { id } = await response.json();
        router.push("/admin/pages/" + id);
        router.refresh();
        return;
      }
      const result = await response.json();
      const message = result.error ?? "Could not copy the page.";
      if (response.status === 409 && message.includes("URL"))
        setSlugError(message);
      else setError(message);
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      active.current = false;
      setPending(false);
    }
  }

  return (
    <form
      className="settings-card grid w-full max-w-[650px] gap-6"
      onSubmit={create}
    >
      <div className="grid gap-2">
        <Label htmlFor="copy-source">Source page</Label>
        <NativeSelect
          id="copy-source"
          required
          disabled={pending || !pages.length}
          value={sourceId}
          onChange={(event) => chooseSource(event.target.value)}
        >
          <NativeSelectOption value="" disabled>
            Choose a page
          </NativeSelectOption>
          {pages.map(({ id, title, slug, visibility }) => (
            <NativeSelectOption key={id} value={id}>
              {title} · {visibility === "public" ? "Public" : "Private"} · /
              {slug}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {!pages.length && (
          <p className="muted m-0">There are no active pages to copy.</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="copy-title">New page title</Label>
        <Input
          id="copy-title"
          required
          maxLength={200}
          disabled={pending || !sourceId}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (customSlug === null) setSlugError("");
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="copy-url">New page URL</Label>
        <div className="page-url-input">
          <span aria-hidden="true">/garden/</span>
          <Input
            id="copy-url"
            required
            maxLength={100}
            disabled={pending || !sourceId}
            value={slug}
            aria-invalid={!!slugError}
            aria-describedby={slugError ? "copy-url-error" : undefined}
            onChange={(event) => {
              setCustomSlug(event.target.value);
              setSlugError("");
            }}
          />
        </div>
        {customSlug !== null && (
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setCustomSlug(null);
                setSlugError("");
              }}
            >
              Use title
            </Button>
          </div>
        )}
        {slugError && (
          <p id="copy-url-error" className="error m-0" role="alert">
            {slugError}
          </p>
        )}
      </div>
      {error && (
        <p className="error m-0" role="alert">
          {error}
        </p>
      )}
      <p className="muted m-0">The new page starts private.</p>
      <div className="actions">
        <Button type="submit" disabled={!sourceId || !title.trim() || pending}>
          {pending ? "Creating copy…" : "Create private copy"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/pages">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
