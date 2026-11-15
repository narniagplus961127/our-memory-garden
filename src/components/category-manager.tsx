"use client";
import {
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Toast } from "./toast";
import { categoryLabels, type Category } from "@/lib/organization";
import {
  applyAdminListOrder,
  type AdminListOrder,
} from "@/lib/admin-list-order";
import {
  AdminListGrip,
  AdminListActions,
  AdminListOrderStatus,
  AdminListRow,
  ListDragFeedback,
} from "./admin-list-row";
import { useListReorder } from "./use-list-reorder";

type CategoryRow = {
  id: string;
  label: string;
  parentId: string | null;
  category: Category;
};

export function CategoryManager({
  initialCategories,
  order,
}: {
  initialCategories: Category[];
  order: AdminListOrder;
}) {
  const router = useRouter();
  const [list, setList] = useState(initialCategories),
    [savedOrder, setSavedOrder] = useState(order),
    [moving, setMoving] = useState<CategoryRow[] | null>(null),
    [orderError, setOrderError] = useState(""),
    [orderConflict, setOrderConflict] = useState(false),
    [selected, setSelected] = useState<Category | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  const returnFocus = useRef<RefObject<HTMLButtonElement | null> | undefined>(
    undefined,
  );
  const rows = useMemo(
    () =>
      applyAdminListOrder(list, savedOrder.ids).map((category) => ({
        id: category.id,
        label: category.name,
        parentId: category.parent_id,
        category,
      })),
    [list, savedOrder.ids],
  );
  const visible = moving ?? rows;
  const { labels, children } = useMemo(() => {
    const children = new Map<string | null, CategoryRow[]>();
    for (const row of visible) {
      const siblings = children.get(row.parentId);
      if (siblings) siblings.push(row);
      else children.set(row.parentId, [row]);
    }
    const labels = categoryLabels(
      visible.map(({ category, parentId }) => ({
        ...category,
        parent_id: parentId,
      })),
    );
    return { labels, children };
  }, [visible]);
  const sort = useListReorder(
    visible,
    Boolean(moving || selected || orderConflict) || visible.length < 2,
    (next) => void reorder(next),
    (item, parentId) => ({ ...item, parentId }),
  );

  async function reorder(next: CategoryRow[]) {
    if (pending.current) return;
    const changed = next.find(
      ({ parentId, category }) => parentId !== category.parent_id,
    );
    const move = changed && {
      id: changed.id,
      parentId: changed.parentId,
      expectedParentId: changed.category.parent_id,
    };
    pending.current = true;
    setMoving(next);
    setOrderError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin-list-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list: "categories",
          ids: next.map(({ id }) => id),
          version: savedOrder.version,
          move,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setOrderConflict(response.status === 409);
        throw Error(result.error);
      }
      setList(
        next.map(({ category, parentId }) => ({
          ...category,
          parent_id: parentId,
        })),
      );
      setSavedOrder(result);
      setNotice("Category order saved.");
    } catch (failure) {
      setOrderError(
        failure instanceof Error && !(failure instanceof TypeError)
          ? failure.message
          : "Could not save the category order. Try dragging again.",
      );
      if (changed)
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLButtonElement>(
              `[data-reorder-id="${changed.id}"] > .admin-list-row .admin-list-drag-handle`,
            )
            ?.focus(),
        );
    } finally {
      pending.current = false;
      setMoving(null);
    }
  }

  function done(message: string) {
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
          expectedParentId: selected.parent_id,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Could not delete this category.");
      setList(result.items);
      setSavedOrder(result.order);
      setOrderConflict(false);
      setOrderError("");
      done("Category deleted. Its pages were kept.");
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
        done("This category was already deleted. Its pages were kept.");
        router.refresh();
        return;
      }
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setSelected(result);
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
  function tree(parent: string | null): ReactNode {
    return (
      <ul className="admin-list admin-list-tree">
        {children.get(parent)?.map((row) => {
          const { category, id, parentId } = row;
          const href = "/admin/categories/" + id + "/edit";
          return (
            <li key={id} {...sort.rowProps(id)}>
              <AdminListRow
                title={category.name}
                detail={parentId ? labels.get(parentId) : undefined}
                href={href}
                locked={Boolean(moving)}
                showEdit={false}
                grip={<AdminListGrip {...sort.handleProps(row)} />}
                trailing={
                  <AdminListActions
                    list="categories"
                    id={id}
                    title={category.name}
                    href={href}
                    disabled={Boolean(moving)}
                    onRemove={(trigger) => {
                      returnFocus.current = trigger;
                      setSelected(category);
                      setError("");
                    }}
                  />
                }
              />
              {children.has(id) && tree(id)}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className="category-manager">
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      <section aria-label="Categories" className="category-list">
        {list.length ? (
          tree(null)
        ) : (
          <div className="empty-state">
            <h2>A place for every chapter</h2>
            <p>Create a category to organize your pages.</p>
          </div>
        )}
        <ListDragFeedback {...sort} tree />
        <AdminListOrderStatus
          busy={Boolean(moving)}
          error={orderError}
          conflict={orderConflict}
        />
      </section>
      {selected && (
        <ConfirmationDialog
          title={"Delete " + selected.name + "?"}
          description="Your pages and photos will be kept. Only this category’s tag will be removed, including from pages in trash. Its subcategories move up one level."
          busy={busy}
          error={error}
          confirmLabel="Delete category"
          retryLabel="Retry deletion"
          reloadLabel="Review saved category"
          onConfirm={() => void remove()}
          onCancel={() => setSelected(null)}
          onReload={() => void review()}
          returnFocus={returnFocus.current}
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
