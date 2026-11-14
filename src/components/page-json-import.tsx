"use client";

import { Tabs } from "radix-ui";
import { useRef, useState, type RefObject } from "react";
import { maxPageJsonBytes } from "@/lib/page-json";
import { Modal } from "./modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";

type Review = {
  blocks: number;
  photos: number;
  visibility: "public" | "private";
};
type SourcePage = { id: string; title: string; slug: string };
type ImportSource = { file: unknown } | { sourcePageId: string };

export function PageJsonImport({
  pageId,
  title,
  returnFocus,
  onClose,
}: {
  pageId: string;
  title: string;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState("json");
  const [name, setName] = useState("");
  const [pages, setPages] = useState<SourcePage[] | null>(null);
  const [sourcePageId, setSourcePageId] = useState("");
  const [ready, setReady] = useState<{
    source: ImportSource;
    review: Review;
  } | null>(null);
  const [busy, setBusy] = useState<"pages" | "review" | "import" | null>(null);
  const [error, setError] = useState("");
  const active = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const url = "/api/pages/" + pageId + "/json";

  async function run(
    action: NonNullable<typeof busy>,
    work: () => Promise<void>,
  ) {
    if (active.current) return;
    active.current = true;
    setBusy(action);
    setError("");
    try {
      await work();
    } catch (error) {
      setError(
        error instanceof TypeError
          ? "Could not connect. Please try again."
          : (error as Error).message,
      );
    } finally {
      active.current = false;
      setBusy(null);
    }
  }

  async function send(source: ImportSource, confirm = false) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...source, confirm }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok)
      throw Error(
        result?.error ?? "Could not import page content. Please try again.",
      );
    return result;
  }

  function loadPages() {
    return run("pages", async () => {
      const response = await fetch(url + "?sources=1", { cache: "no-store" });
      if (!response.ok) throw Error("Could not load the page list.");
      setPages(await response.json());
    });
  }

  function switchMode(next: string) {
    setMode(next);
    setName("");
    setSourcePageId("");
    setReady(null);
    setError("");
    if (next === "page" && !pages) void loadPages();
  }

  function reviewFile(selected: File) {
    setName(selected.name);
    setReady(null);
    return run("review", async () => {
      if (selected.size > maxPageJsonBytes)
        throw Error("Choose a JSON file up to 2 MB.");
      let file: unknown;
      try {
        file = JSON.parse((await selected.text()).replace(/^\uFEFF/, ""));
      } catch {
        throw Error(
          "This file is not valid JSON. Check its syntax and choose it again.",
        );
      }
      const source = { file };
      setReady({ source, review: await send(source) });
    });
  }

  function reviewPage(id: string) {
    setSourcePageId(id);
    setReady(null);
    if (!id) {
      setError("");
      return;
    }
    return run("review", async () => {
      const source = { sourcePageId: id };
      setReady({ source, review: await send(source) });
    });
  }

  function replace() {
    if (!ready) return;
    return run("import", async () => {
      await send(ready.source, true);
      window.location.reload();
    });
  }

  const review = ready?.review;
  return (
    <Modal
      title="Import page content"
      description={"Replace the editor content of " + title + "."}
      onClose={onClose}
      returnFocus={returnFocus}
      busy={!!busy}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={!!busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!ready || !!busy}
            onClick={() => void replace()}
          >
            {busy === "import" ? "Importing…" : "Replace page content"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Tabs.Root value={mode} onValueChange={switchMode}>
          <Tabs.List
            aria-label="Import source"
            className="flex flex-wrap gap-1 border-b border-border mb-4 [&_button]:min-h-11 [&_button]:px-3 [&_button]:border-b-2 [&_button]:border-transparent [&_button[data-state=active]]:border-primary-foreground [&_button[data-state=active]]:font-semibold"
          >
            <Tabs.Trigger value="json" disabled={!!busy}>
              Upload JSON
            </Tabs.Trigger>
            <Tabs.Trigger value="page" disabled={!!busy}>
              Use another page
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="json" className="grid gap-2">
            <Label htmlFor="page-json-file">Page JSON file</Label>
            <Input
              ref={input}
              id="page-json-file"
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              tabIndex={-1}
              disabled={!!busy}
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (selected) void reviewFile(selected);
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={!!busy}
                onClick={() => input.current?.click()}
              >
                {name ? "Change file" : "Choose JSON file"}
              </Button>
              {name && (
                <span className="min-w-0 break-all text-sm text-muted-foreground">
                  {name}
                </span>
              )}
            </div>
          </Tabs.Content>
          <Tabs.Content value="page" className="grid gap-2">
            {pages && pages.length > 0 && (
              <>
                <Label htmlFor="page-content-source">Source page</Label>
                <NativeSelect
                  id="page-content-source"
                  value={sourcePageId}
                  disabled={!!busy}
                  onChange={(event) => void reviewPage(event.target.value)}
                >
                  <NativeSelectOption value="">
                    Choose a page
                  </NativeSelectOption>
                  {pages.map((page) => (
                    <NativeSelectOption key={page.id} value={page.id}>
                      {page.title} · /{page.slug}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {error && sourcePageId && !review && (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void reviewPage(sourcePageId)}
                    >
                      Review again
                    </Button>
                  </div>
                )}
              </>
            )}
            {pages?.length === 0 && (
              <p className="m-0 muted">There are no other pages to use.</p>
            )}
            {!pages && error && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadPages()}
                >
                  Retry loading pages
                </Button>
              </div>
            )}
          </Tabs.Content>
        </Tabs.Root>
        {busy === "pages" && (
          <p role="status" className="m-0 muted">
            Loading pages…
          </p>
        )}
        {busy === "review" && (
          <p role="status" className="m-0 muted">
            Checking the content…
          </p>
        )}
        {error && (
          <p role="alert" className="error m-0">
            {error}
          </p>
        )}
        {review && (
          <>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
              <dt className="font-semibold">Content</dt>
              <dd className="m-0">
                {review.blocks} {review.blocks === 1 ? "block" : "blocks"} ·{" "}
                {review.photos} {review.photos === 1 ? "photo" : "photos"}
              </dd>
            </dl>
            <p className="m-0 muted">
              Page settings stay the same. You can restore the previous version
              from History.
            </p>
            {review.visibility === "public" && (
              <p className="m-0">
                This page is public. The imported content will appear on the
                website immediately.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
