"use client";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Toast } from "./toast";
import type { Category } from "@/lib/organization";
import type { AdminListOrder } from "@/lib/admin-list-order";
import {
  AdminListGrip,
  AdminListOrderStatus,
  AdminListRow,
  ListDragFeedback,
} from "./admin-list-row";
import { useAdminListOrder } from "./use-admin-list-order";
const categoryLabel = (category: Category) => category.name;
export function CategoryManager({
  initialCategories,
  order,
}: {
  initialCategories: Category[];
  order: AdminListOrder;
}) {
  const [list, setList] = useState(initialCategories),
    [selected, setSelected] = useState<Category | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  const sort = useAdminListOrder(
    "categories",
    list,
    categoryLabel,
    order,
    Boolean(selected),
  );
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
          <ul className="admin-list">
            {sort.ordered.map((category) => (
              <li key={category.id} {...sort.rowProps(category.id)}>
                <AdminListRow
                  title={category.name}
                  href={"/admin/categories/" + category.id + "/edit"}
                  grip={
                    <AdminListGrip
                      {...sort.handleProps({
                        id: category.id,
                        label: category.name,
                      })}
                    />
                  }
                  trailing={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={"Delete " + category.name}
                      title={"Delete " + category.name}
                      disabled={sort.busy}
                      onClick={() => {
                        setSelected(category);
                        setError("");
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h2>A place for every chapter</h2>
            <p>Create a category to organize your pages.</p>
          </div>
        )}
        <ListDragFeedback {...sort} />
        <AdminListOrderStatus {...sort} />
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
