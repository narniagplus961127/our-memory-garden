"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Category } from "@/lib/organization";
export function CategoryManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [list, setList] = useState(initialCategories),
    [name, setName] = useState(""),
    [editing, setEditing] = useState<Category | null>(null),
    [rename, setRename] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    category?: Category,
  ) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch(
        "/api/categories" + (category ? "/" + category.id : ""),
        {
          method: category ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: category ? rename : name,
            expectedName: category?.name,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Could not change this category.");
      setList((current) =>
        [...current.filter((item) => item.id !== result.id), result].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      );
      if (category) setEditing(null);
      else setName("");
      setStatus(
        category
          ? "Category renamed. Pages keep their category."
          : "Category created. Choose it in a page’s settings.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not connect. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="category-manager">
      <form
        className="settings-card category-create"
        aria-label="Create category"
        onSubmit={(event) => void submit(event)}
      >
        <h2>Create a category</h2>
        <div className="field">
          <Label htmlFor="new-category-name">Category name</Label>
          <Input
            id="new-category-name"
            value={name}
            maxLength={100}
            required
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button disabled={busy || !name.trim()}>Create category</Button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p role="status" className="muted">
        {status}
      </p>
      <section aria-label="Categories" className="category-list">
        <h2>Your categories</h2>
        <p className="muted">
          Assign a category in Page settings. Renaming updates its name
          everywhere.
        </p>
        {list.length ? (
          <ul>
            {list.map((category) => (
              <li key={category.id}>
                {editing?.id === category.id ? (
                  <form
                    aria-label={"Rename " + category.name}
                    onSubmit={(event) => void submit(event, editing)}
                  >
                    <div className="field">
                      <Label htmlFor="rename-category">Rename category</Label>
                      <Input
                        id="rename-category"
                        autoFocus
                        value={rename}
                        required
                        maxLength={100}
                        disabled={busy}
                        onChange={(event) => setRename(event.target.value)}
                      />
                    </div>
                    <div className="actions">
                      <Button disabled={busy || !rename.trim()}>
                        Rename category
                      </Button>
                      <Button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="category-row">
                    <span>{category.name}</span>
                    <Button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      aria-label={"Rename " + category.name}
                      onClick={() => {
                        setEditing(category);
                        setRename(category.name);
                        setError("");
                        setStatus("");
                      }}
                    >
                      Rename
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>A place for every chapter</h3>
            <p>Create your first category above.</p>
          </div>
        )}
      </section>
    </div>
  );
}
