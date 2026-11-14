"use client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type RefObject } from "react";
import type { AdminListOrder } from "@/lib/admin-list-order";
import { starterTemplates, type TemplateSummary } from "@/lib/page-templates";
import {
  AdminListActions,
  AdminListGrip,
  AdminListOrderStatus,
  AdminListRow,
  ListDragFeedback,
} from "./admin-list-row";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Toast } from "./toast";
import { useAdminListOrder } from "./use-admin-list-order";

const templateLabel = (template: TemplateSummary) => template.name;

export function TemplateList({
  templates,
  order,
}: {
  templates: TemplateSummary[];
  order: AdminListOrder;
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState<string[]>([]);
  const [selected, setSelected] = useState<TemplateSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const returnFocus = useRef<RefObject<HTMLButtonElement | null> | undefined>(
    undefined,
  );
  const available = useMemo(
    () => templates.filter(({ id }) => !removed.includes(id)),
    [templates, removed],
  );
  const sort = useAdminListOrder(
    "templates",
    available,
    templateLabel,
    order,
    Boolean(selected),
  );

  async function remove() {
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/templates/" + selected.id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: selected.version, confirm: true }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Could not delete the template.");
      }
      setRemoved((current) => [...current, selected.id]);
      setSelected(null);
      setNotice("Template deleted.");
      requestAnimationFrame(() =>
        document.getElementById("templates-title")?.focus(),
      );
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error && !(failure instanceof TypeError)
          ? failure.message
          : "Could not connect. Try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      {available.length ? (
        <ul className="admin-list">
          {sort.ordered.map((template) => (
            <li key={template.id} {...sort.rowProps(template.id)}>
              <AdminListRow
                title={template.name}
                detail={
                  starterTemplates.some(({ id }) => id === template.id)
                    ? "Starter template"
                    : undefined
                }
                href={"/admin/templates/" + template.id}
                showEdit={false}
                grip={
                  <AdminListGrip
                    {...sort.handleProps({
                      id: template.id,
                      label: template.name,
                    })}
                  />
                }
                trailing={
                  <AdminListActions
                    list="templates"
                    id={template.id}
                    title={template.name}
                    href={"/admin/templates/" + template.id}
                    disabled={sort.busy}
                    onRemove={(trigger) => {
                      returnFocus.current = trigger;
                      setError("");
                      setNotice("");
                      setSelected(template);
                    }}
                  />
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>No saved templates yet</h2>
          <p>Create one here or save a layout from Page settings.</p>
        </div>
      )}
      <ListDragFeedback {...sort} />
      <AdminListOrderStatus {...sort} />
      {selected && (
        <ConfirmationDialog
          title={`Delete ${selected.name}?`}
          description="This removes the template from the starting-layout picker. Pages created from it will be kept."
          busy={busy}
          error={error}
          confirmLabel="Delete template"
          retryLabel="Retry deletion"
          reloadLabel="Reload list"
          onReload={() => {
            setSelected(null);
            router.refresh();
          }}
          onConfirm={() => void remove()}
          onCancel={() => setSelected(null)}
          returnFocus={returnFocus.current}
        />
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
    </>
  );
}
