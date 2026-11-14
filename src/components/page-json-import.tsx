"use client";

import { useRef, useState, type RefObject } from "react";
import { maxPageJsonBytes } from "@/lib/page-json";
import { Modal } from "./modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Review = {
  version: number;
  title: string;
  date: string | null;
  blocks: number;
  photos: number;
  visibility: "public" | "private";
};

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
  const [name, setName] = useState("");
  const [file, setFile] = useState<unknown>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState<"review" | "import" | null>(null);
  const [error, setError] = useState("");
  const active = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const url = "/api/pages/" + pageId + "/json";

  async function send(document: unknown, current?: Review) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        current
          ? { file: document, confirm: true, version: current.version }
          : { file: document },
      ),
    });
    if (!response.ok) {
      if (response.status === 409) setReview(null);
      const result = await response.json().catch(() => null);
      throw Error(
        result?.error ?? "Could not import page JSON. Please try again.",
      );
    }
    return response.json();
  }

  async function select(selected: File) {
    if (active.current) return;
    active.current = true;
    setBusy("review");
    setName(selected.name);
    setFile(null);
    setReview(null);
    setError("");
    try {
      if (selected.size > maxPageJsonBytes)
        throw Error("Choose a JSON file up to 2 MB.");
      let document: unknown;
      try {
        document = JSON.parse((await selected.text()).replace(/^\uFEFF/, ""));
      } catch {
        throw Error(
          "This file is not valid JSON. Check its syntax and choose it again.",
        );
      }
      const result: Review = await send(document);
      setFile(document);
      setReview(result);
    } catch (error) {
      setError(
        error instanceof TypeError
          ? "Could not connect. Choose the file again to retry."
          : (error as Error).message,
      );
    } finally {
      active.current = false;
      setBusy(null);
    }
  }

  async function replace() {
    if (active.current || !review) return;
    active.current = true;
    setBusy("import");
    setError("");
    try {
      await send(file, review);
      // Reset the editor and its autosave state from the newly committed page.
      window.location.reload();
    } catch (error) {
      setError(
        error instanceof TypeError
          ? "Could not confirm the import. Reload the page to check its saved content before trying again."
          : (error as Error).message,
      );
      setBusy(null);
      active.current = false;
    }
  }

  return (
    <Modal
      title="Import page JSON"
      description={
        "Replace the saved content and editable details of " + title + "."
      }
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
            disabled={!review || !!busy}
            onClick={() => void replace()}
          >
            {busy === "import" ? "Importing…" : "Replace page content"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
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
              if (selected) void select(selected);
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
        </div>
        {busy === "review" && (
          <p role="status" className="m-0 muted">
            Checking the file…
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
              <dt className="font-semibold">New title</dt>
              <dd className="m-0 break-words">{review.title}</dd>
              {review.date && (
                <>
                  <dt className="font-semibold">Page date</dt>
                  <dd className="m-0">{review.date}</dd>
                </>
              )}
              <dt className="font-semibold">Content</dt>
              <dd className="m-0">
                {review.blocks} {review.blocks === 1 ? "block" : "blocks"} ·{" "}
                {review.photos} {review.photos === 1 ? "photo" : "photos"}
              </dd>
            </dl>
            <p className="m-0 muted">
              The URL and visibility stay the same. You can restore the previous
              version from History.
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
