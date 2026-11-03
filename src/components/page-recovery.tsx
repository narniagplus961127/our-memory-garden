"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GardenPage } from "@/lib/pages";
import type { InboundReference } from "@/lib/server/page-recovery";
import { ConfirmationDialog } from "./confirmation-dialog";

const RecoveryPageContext = createContext<{
  page: GardenPage;
  acknowledge: (saved: GardenPage) => void;
} | null>(null);

export function RecoveryPage({
  page,
  children,
}: {
  page: GardenPage;
  children: ReactNode;
}) {
  const [acknowledged, setAcknowledged] = useState<GardenPage | null>(null);
  const current =
    acknowledged?.id === page.id && acknowledged.version > page.version
      ? acknowledged
      : page;
  return (
    <RecoveryPageContext.Provider
      value={{
        page: current,
        acknowledge: (saved) =>
          setAcknowledged((previous) =>
            !previous ||
            previous.id !== saved.id ||
            saved.version > previous.version
              ? { ...page, ...saved }
              : previous,
          ),
      }}
    >
      {children}
    </RecoveryPageContext.Provider>
  );
}

export function RestoreVersion({
  page: initialPage,
  revision,
}: {
  page: GardenPage;
  revision: number;
}) {
  const router = useRouter();
  const recovery = useContext(RecoveryPageContext);
  const page =
    recovery?.page.id === initialPage.id ? recovery.page : initialPage;
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function restore() {
    if (busy) return;
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
      recovery?.acknowledge(data);
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
          setError("");
        }}
        disabled={busy || Boolean(page.deleted_at)}
      >
        Restore this version
      </button>
      {confirm && (
        <ConfirmationDialog
          title={"Restore version " + revision + "?"}
          description="The current saved version will be kept in history. This page’s current visibility and address stay unchanged. Unsaved editor work is not included."
          busy={busy}
          error={error}
          confirmLabel="Confirm restore version"
          retryLabel="Retry restore"
          reloadLabel="Reload history"
          onConfirm={() => void restore()}
          onCancel={() => {
            setConfirm(false);
            setError("");
          }}
          onReload={() => {
            setConfirm(false);
            setError("");
            router.refresh();
          }}
        />
      )}
      {success && <p role="status">{success}</p>}
    </div>
  );
}
export function TrashAction({
  page: initialPage,
  references = [],
  onDone,
}: {
  page: GardenPage;
  references?: InboundReference[];
  onDone?: (message: string) => void;
}) {
  const router = useRouter();
  const recovery = useContext(RecoveryPageContext);
  const page =
    recovery?.page.id === initialPage.id ? recovery.page : initialPage;
  const [action, setAction] = useState<"trash" | "restore" | "delete" | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit() {
    if (!action || busy) return;
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
      if (action !== "delete") recovery?.acknowledge(data);
      const message =
        action === "restore"
          ? "Page restored as private."
          : action === "delete"
            ? "Page permanently deleted."
            : "Page moved to trash.";
      setSuccess(message);
      setAction(null);
      onDone?.(message);
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
            onClick={() => {
              setAction("trash");
              setError("");
              setSuccess("");
            }}
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
        <ConfirmationDialog
          title={
            action === "delete"
              ? "Permanently delete " + page.title + "?"
              : action === "restore"
                ? "Restore " + page.title + " as private?"
                : "Move " + page.title + " to trash?"
          }
          description={
            action === "delete"
              ? "This cannot be undone. This page and its version history will be removed. Other pages and photos will be kept."
              : action === "restore"
                ? "The page keeps its stable links and returns private for review."
                : "The page will be hidden from visitors. You can restore it from trash."
          }
          busy={busy}
          error={error}
          confirmLabel={
            action === "delete"
              ? "Confirm permanent deletion"
              : action === "restore"
                ? "Confirm restore as private"
                : "Confirm move to trash"
          }
          retryLabel="Retry action"
          reloadLabel="Reload page"
          onConfirm={() => void submit()}
          onCancel={() => {
            setAction(null);
            setError("");
          }}
          onReload={() => {
            setAction(null);
            setError("");
            router.refresh();
          }}
        >
          {action === "trash" && (
            <>
              <h3>Links to this page</h3>
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
        </ConfirmationDialog>
      )}
      {success && <p role="status">{success}</p>}
    </div>
  );
}

export function TrashList({ pages }: { pages: GardenPage[] }) {
  const [notice, setNotice] = useState("");
  return (
    <>
      {notice && <p role="status">{notice}</p>}
      {pages.length ? (
        pages.map((page) => (
          <article className="trash-card" key={page.id}>
            <h2>{page.title}</h2>
            <p>
              Moved to trash{" "}
              {new Date(page.deleted_at!).toLocaleString("en-GB")}
            </p>
            <Link href={"/admin/pages/" + page.id + "/history"}>
              View saved history
            </Link>
            <TrashAction page={page} onDone={setNotice} />
          </article>
        ))
      ) : (
        <p>The trash is empty.</p>
      )}
    </>
  );
}
