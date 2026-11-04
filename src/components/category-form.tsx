"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { addressFromTitle, validSlug } from "@/lib/page-address";
import type { Category } from "@/lib/organization";
export function CategoryForm({
  id,
  category,
}: {
  id: string;
  category?: Category;
}) {
  const router = useRouter(),
    pending = useRef(false),
    expected = useRef(category);
  const [name, setName] = useState(category?.name ?? ""),
    [slug, setSlug] = useState(category?.slug ?? ""),
    [follow, setFollow] = useState(!category),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState<Category | null>(null);
  const generated = (value: string) =>
    value.trim() ? addressFromTitle(value) || "category-" + id.slice(0, 8) : "";
  function back() {
    router.push("/admin/categories");
    router.refresh();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (!name.trim() || !validSlug(slug)) {
      setError("Enter a category name and a valid address.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setConflict(null);
    try {
      const response = await fetch(
        "/api/categories" + (category ? "/" + id : ""),
        {
          method: category ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            ...(category
              ? {
                  expectedName: expected.current?.name,
                  expectedSlug: expected.current?.slug,
                }
              : { id }),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && category) {
          const latest = await fetch("/api/categories/" + id, {
            cache: "no-store",
          });
          if (latest.ok) setConflict(await latest.json());
        }
        throw Error(result.error ?? "Could not save this category.");
      }
      back();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not connect. Your entries are still here. Try again.",
      );
      pending.current = false;
      setBusy(false);
    }
  }
  const backLink = (text: string) => (
    <Link
      href="/admin/categories"
      aria-disabled={busy}
      onClick={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      {text}
    </Link>
  );
  return (
    <>
      {backLink("← Categories")}
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your categories</p>
          <h1>{category ? "Edit category" : "Create category"}</h1>
          <p className="muted">
            Give this collection a name and its own website address.
          </p>
        </div>
      </div>
      <form
        className="settings-card navigation-item-form category-item-form"
        onSubmit={submit}
      >
        <fieldset disabled={busy}>
          <div className="navigation-form-field">
            <Label htmlFor="category-name">Category name</Label>
            <Input
              id="category-name"
              maxLength={100}
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (follow) setSlug(generated(event.target.value));
              }}
            />
          </div>
          <div className="navigation-form-field">
            <Label htmlFor="category-slug">Category address</Label>
            <div className="page-url-input">
              <span aria-hidden="true">/category/</span>
              <Input
                id="category-slug"
                maxLength={100}
                required
                value={slug}
                aria-invalid={Boolean(slug) && !validSlug(slug)}
                aria-describedby="category-address-help"
                onChange={(event) => {
                  setFollow(false);
                  setSlug(event.target.value);
                }}
              />
            </div>
            <small id="category-address-help" className="muted">
              Lowercase letters, numbers and single hyphens. Changing a saved
              address removes the old address; links selected by category will
              keep working.
            </small>
            <Button
              type="button"
              variant="outline"
              className="justify-self-start"
              disabled={!name.trim()}
              onClick={() => {
                setFollow(true);
                setSlug(generated(name));
              }}
            >
              Use name
            </Button>
          </div>
        </fieldset>
        {error && (
          <div role="alert" className="navigation-form-error">
            <p className="error">{error}</p>
            {conflict && (
              <>
                <p>
                  Saved category: <strong>{conflict.name}</strong> · /category/
                  {conflict.slug}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    expected.current = conflict;
                    setName(conflict.name);
                    setSlug(conflict.slug);
                    setFollow(false);
                    setConflict(null);
                    setError("");
                  }}
                >
                  Load saved values
                </Button>
              </>
            )}
          </div>
        )}
        <div className="actions">
          <Button disabled={busy || !name.trim() || !validSlug(slug)}>
            {busy
              ? "Saving…"
              : category
                ? "Update category"
                : "Create category"}
          </Button>
          <Button asChild variant="outline">
            {backLink("Cancel")}
          </Button>
        </div>
      </form>
    </>
  );
}
