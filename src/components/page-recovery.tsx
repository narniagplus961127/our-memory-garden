"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GardenPage } from "@/lib/pages";
import type { InboundReference } from "@/lib/server/page-recovery";
export function RestoreVersion({
  page,
  revision,
}: {
  page: GardenPage;
  revision: number;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function restore() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/pages/" + page.id + "/history/" + revision, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: page.version, confirm: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSuccess("Version restored. The previous content is kept in history.");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not restore. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="recovery-action">
      <button
        className="button"
        onClick={() => {
          setConfirm(true);
          setSuccess("");
        }}
        disabled={busy || Boolean(page.deleted_at)}
      >
        Restore this version
      </button>
      {confirm && (
        <div
          className="recovery-confirm"
          role="region"
          aria-label="Confirm version restoration"
        >
          <h3>Restore version {revision}?</h3>
          <p>
            The current saved version will be kept in history. This page’s
            current visibility and address stay unchanged. Unsaved editor work
            is not included.
          </p>
          <button className="button" disabled={busy} onClick={restore}>
            {busy ? "Restoring…" : "Confirm restore version"}
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={restore} disabled={busy}>
            Retry restore
          </button>{" "}
          <button onClick={() => router.refresh()}>Reload history</button>
        </p>
      )}
      {success && <p role="status">{success}</p>}
    </div>
  );
}
export function TrashAction({
  page,
  references = [],
  onDone,
}: {
  page: GardenPage;
  references?: InboundReference[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [action, setAction] = useState<"trash" | "restore" | "delete" | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/pages/" + page.id + "/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, version: page.version, confirm: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSuccess(
        action === "restore"
          ? "Page restored as private."
          : action === "delete"
            ? "Page permanently deleted."
            : "Page moved to trash.",
      );
      setAction(null);
      onDone?.();
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not complete this action. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="recovery-action">
      {page.deleted_at ? (
        <>
          <button
            className="button"
            onClick={() => {
              setAction("restore");
              setError("");
            }}
            disabled={busy}
          >
            Restore as private
          </button>
          <button
            className="button secondary"
            onClick={() => {
              setAction("delete");
              setError("");
            }}
            disabled={busy}
          >
            Delete permanently
          </button>
        </>
      ) : (
        <>
          <button
            className="button secondary"
            onClick={() => setAction("trash")}
            disabled={page.is_homepage || busy}
          >
            Move to trash
          </button>
          {page.is_homepage && (
            <p>
              Choose another homepage in Settings before moving this page to
              trash.
            </p>
          )}
        </>
      )}
      {action && (
        <div
          className="recovery-confirm"
          role="region"
          aria-label="Confirm page action"
        >
          <h3>
            {action === "delete"
              ? "Permanently delete " + page.title + "?"
              : action === "restore"
                ? "Restore " + page.title + " as private?"
                : "Move " + page.title + " to trash?"}
          </h3>
          <p>
            {action === "delete"
              ? "This cannot be undone. This page and its version history will be removed. Other pages and photos will be kept."
              : action === "restore"
                ? "The page keeps its stable links and returns private for review."
                : "The page will be hidden from visitors. You can restore it from trash."}
          </p>
          {action === "trash" && (
            <>
              <h4>Links to this page</h4>
              {references.length ? (
                <ul>
                  {references.map((r, i) => (
                    <li key={i}>
                      {r.kind}:{" "}
                      {r.id === "navigation" ? (
                        <Link href="/admin/navigation">{r.title}</Link>
                      ) : (
                        <Link href={"/admin/pages/" + r.id}>{r.title}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No current inbound menu, text, button or page grid links.</p>
              )}
              <p>
                Existing text and button links will lead to not found; menus and
                grids hide this page.
              </p>
            </>
          )}
          <button className="button" disabled={busy} onClick={submit}>
            {busy
              ? "Working…"
              : action === "delete"
                ? "Confirm permanent deletion"
                : action === "restore"
                  ? "Confirm restore as private"
                  : "Confirm move to trash"}
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setAction(null);
              setError("");
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button disabled={busy} onClick={submit}>
            Retry action
          </button>{" "}
          <button onClick={() => router.refresh()}>Reload page</button>
        </p>
      )}
      {success && <p role="status">{success}</p>}
    </div>
  );
}
