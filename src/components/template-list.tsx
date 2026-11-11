"use client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { starterTemplates, type TemplateSummary } from "@/lib/page-templates";
import { AdminListRow } from "./admin-list-row";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Toast } from "./toast";
import { Button } from "./ui/button";

export function TemplateList({ templates }: { templates: TemplateSummary[] }) {
  const router = useRouter();
  const [removed, setRemoved] = useState<string[]>([]);
  const [selected, setSelected] = useState<TemplateSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const available = templates.filter(({ id }) => !removed.includes(id));

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
          {available.map((template) => (
            <li key={template.id}>
              <AdminListRow
                title={template.name}
                detail={
                  starterTemplates.some(({ id }) => id === template.id)
                    ? "Starter template"
                    : undefined
                }
                href={"/admin/templates/" + template.id}
                trailing={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={"Delete " + template.name}
                    title={"Delete " + template.name}
                    onClick={() => {
                      setError("");
                      setNotice("");
                      setSelected(template);
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
          <h2>No saved templates yet</h2>
          <p>Create one here or save a layout from Page settings.</p>
        </div>
      )}
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
        />
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
    </>
  );
}
