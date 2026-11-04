"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Toast } from "./toast";
import type { Category } from "@/lib/organization";
export function CategoryManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [list, setList] = useState(initialCategories),
    [selected, setSelected] = useState<Category | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  function done(id: string, message: string) {
    setList((current) => current.filter((c) => c.id !== id));
    setSelected(null);
    setError("");
    setNotice(message);
    requestAnimationFrame(() =>
      document.getElementById("categories-title")?.focus(),
    );
  }
  async function remove() {
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/categories/" + selected.id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          expectedName: selected.name,
          expectedSlug: selected.slug,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Could not delete this category.");
      done(selected.id, "Category deleted. Its pages were kept.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not connect. Try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function review() {
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/categories/" + selected.id, {
        cache: "no-store",
      });
      if (response.status === 404) {
        done(
          selected.id,
          "This category was already deleted. Its pages were kept.",
        );
        return;
      }
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setSelected(result);
      setList((current) =>
        current.map((c) => (c.id === result.id ? result : c)),
      );
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not load the category. Try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="category-manager">
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      <section aria-label="Categories" className="category-list">
        {list.length ? (
          <ul>
            {list.map((category) => (
              <li key={category.id}>
                <div className="category-row">
                  <strong className="category-name">{category.name}</strong>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="icon">
                      <Link
                        href={"/admin/categories/" + category.id + "/edit"}
                        aria-label={"Edit " + category.name}
                        title={"Edit " + category.name}
                      >
                        <Pencil aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={"Delete " + category.name}
                      title={"Delete " + category.name}
                      onClick={() => {
                        setSelected(category);
                        setError("");
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h2>A place for every chapter</h2>
            <p>Create a category to organize your pages.</p>
          </div>
        )}
      </section>
      {selected && (
        <ConfirmationDialog
          title={"Delete " + selected.name + "?"}
          description="Your pages and photos will be kept. Their category assignment will be cleared, including pages in trash."
          busy={busy}
          error={error}
          confirmLabel="Delete category"
          retryLabel="Retry deletion"
          reloadLabel="Review saved category"
          onConfirm={() => void remove()}
          onCancel={() => setSelected(null)}
          onReload={() => void review()}
        >
          <p>
            Links to this category will lead to not found. Menu items pointing
            here will be hidden from visitors, and category-based page grids
            will become empty. Saved versions that require this category cannot
            be restored after deletion.
          </p>
        </ConfirmationDialog>
      )}
    </div>
  );
}
