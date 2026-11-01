"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
type Part = {
  id: string;
  number: number;
  kind: string;
  status: "pending" | "ready" | "error";
  filename: string;
  bytes?: number;
  error?: string;
};
type Job = {
  id: string;
  status: "pending" | "ready" | "error";
  snapshot_at: string;
  expires_at: string;
  expired: boolean;
  filename: string;
  bytes?: number;
  pages: number;
  photos: number;
  parts: Part[];
  error?: string;
};
type Usage = {
  originals: number;
  display: number;
  archives: number;
  staging: number;
  total: number;
  measuredAt: string;
  source: string;
  databaseBytes: number;
  databaseSource: string;
};
const bytes = (value: number) => {
  const unit = value < 1024 ? "B" : value < 1024 * 1024 ? "KB" : "MB";
  const divisor = unit === "B" ? 1 : unit === "KB" ? 1024 : 1024 * 1024;
  return (
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
      value / divisor,
    ) +
    " " +
    unit
  );
};
async function request(path: string, method = "GET") {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    ...(method === "POST"
      ? { headers: { "Content-Type": "application/json" }, body: "{}" }
      : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Could not complete the request. Please retry.",
    );
  return data;
}
export function ExportSettings() {
  const stopPreparing = useRef(false);
  const [job, setJob] = useState<Job | null>(null),
    [busy, setBusy] = useState(true),
    [preparing, setPreparing] = useState(false),
    [error, setError] = useState(""),
    [resume, setResume] = useState(0),
    [cancelConfirm, setCancelConfirm] = useState(false);
  useEffect(() => {
    let active = true;
    request("/api/exports")
      .then((data) => {
        if (active) setJob(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (
      !job ||
      job.expired ||
      job.status === "ready" ||
      (job.status === "error" && resume === 0)
    )
      return;
    let active = true;
    stopPreparing.current = false;
    setPreparing(true);
    void (async () => {
      try {
        let current = job;
        while (
          active &&
          !stopPreparing.current &&
          current.status !== "ready" &&
          !current.expired
        ) {
          current = await request(
            "/api/exports/" + job.id + "/prepare",
            "POST",
          );
          if (active && !stopPreparing.current) {
            setJob(current);
            setError("");
          }
          if (current.status === "error") break;
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setPreparing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [job?.id, resume]);
  useEffect(() => {
    if (!job || job.expired) return;
    const timer = setTimeout(
      () =>
        setJob((current) =>
          current
            ? {
                ...current,
                expired: true,
                status: "error",
                error: "This export expired. Create a fresh export.",
              }
            : null,
        ),
      Math.max(0, new Date(job.expires_at).getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [job?.id, job?.expires_at]);
  async function create() {
    setBusy(true);
    setError("");
    setResume(0);
    try {
      setJob(await request("/api/exports", "POST"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download(
    event: React.MouseEvent<HTMLAnchorElement>,
    part: Part,
  ) {
    event.preventDefault();
    if (!job) return;
    setError("");
    try {
      const path = "/api/exports/" + job.id + "/parts/" + part.id + "/download";
      const response = await fetch(path, { method: "HEAD", cache: "no-store" });
      if (!response.ok)
        throw new Error(
          response.status === 410
            ? "This export expired. Create a fresh export."
            : "This archive part is unavailable. Retry or resume preparation.",
        );
      window.location.assign(path);
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes("expired"))
        setJob((current) =>
          current ? { ...current, expired: true, status: "error" } : null,
        );
    }
  }
  async function cancel() {
    if (!job) return;
    stopPreparing.current = true;
    setPreparing(false);
    setBusy(true);
    try {
      const response = await fetch("/api/exports/" + job.id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setJob(data);
      setCancelConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ready = job?.status === "ready",
    active = job && !job.expired,
    completed =
      job?.parts.filter((part) => part.status === "ready").length ?? 0;
  return (
    <section className="backup-settings">
      <Link href="/admin/settings">← Back to settings</Link>
      <h1>
        {ready
          ? "Your export is ready"
          : active
            ? "Export in progress"
            : "Export garden"}
      </h1>
      <h2>Your garden, kept independently.</h2>
      <p>
        Back up every page and original photo, including private pages, trash
        and retained history. Download the manifest and all archive parts, then
        extract every part into the same folder.
      </p>
      {busy && <p role="status">Loading export…</p>}
      {active && (
        <>
          <p role="status">
            {preparing
              ? "Preparing content and original photos…"
              : ready
                ? "All archive parts are ready."
                : "Preparation can resume from this snapshot."}{" "}
            {completed} of {job.parts.length} parts ready.
          </p>
          {preparing && <progress aria-label="Preparing export" />}
          <div className="settings-card">
            <h3>A consistent snapshot</h3>
            <p>
              {job.pages} pages · {job.photos} original photos · Snapshot{" "}
              {new Date(job.snapshot_at).toLocaleString()}
            </p>
            <p>
              You can keep editing. Closing this screen pauses preparation after
              the current part; reopen it to continue. Ready parts stay
              available until {new Date(job.expires_at).toLocaleString()}.
            </p>
            <a
              className="button secondary"
              href={"/api/exports/" + job.id + "/manifest"}
            >
              Download manifest
            </a>
          </div>
          {job.parts.map((part) => (
            <div className="settings-card" key={part.id}>
              <h3>
                Part {part.number} ·{" "}
                {part.kind === "originals"
                  ? "Original photos"
                  : "Page content and inventory"}
              </h3>
              <p>{part.filename}</p>
              <p>
                {part.status === "ready"
                  ? bytes(Number(part.bytes))
                  : part.status === "error"
                    ? "Preparation failed · retry available"
                    : "Awaiting preparation"}
              </p>
              {part.status === "ready" && (
                <a
                  className="button"
                  onClick={(event) => void download(event, part)}
                  href={
                    "/api/exports/" + job.id + "/parts/" + part.id + "/download"
                  }
                >
                  {"Download part " + part.number}
                </a>
              )}
            </div>
          ))}
        </>
      )}
      {(error || job?.status === "error") && (
        <div className="settings-card error" role="alert">
          <h3>Export needs attention</h3>
          <p>{error || job?.error}</p>
        </div>
      )}
      <div className="actions">
        {active && !ready ? (
          <>
            <button
              disabled={busy || preparing}
              onClick={() => {
                setError("");
                setResume((value) => value + 1);
              }}
            >
              Resume export
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setCancelConfirm(true)}
            >
              Cancel export
            </button>
          </>
        ) : (
          <button disabled={busy} onClick={() => void create()}>
            {job?.expired
              ? "Create fresh export"
              : ready
                ? "Create fresh export"
                : "Create export"}
          </button>
        )}
      </div>
      {cancelConfirm && (
        <div className="settings-card">
          <h3>Cancel this export?</h3>
          <p>
            This releases unfinished photo reservations. Existing page content
            and original photos remain in the garden.
          </p>
          <div className="actions">
            <button disabled={busy} onClick={() => void cancel()}>
              Confirm cancellation
            </button>
            <button
              className="secondary"
              onClick={() => setCancelConfirm(false)}
            >
              Keep preparing
            </button>
          </div>
        </div>
      )}
      <p className="muted">
        Each preparation step handles a bounded part: up to 8 MB of content
        records or 200 MB of originals, within five minutes. The complete
        collection can span any number of parts. Downloads require sign-in,
        support resuming, and expire after 24 hours without further preparation.
        Keep the complete backup private.
      </p>
    </section>
  );
}
export function StorageSettings() {
  const [usage, setUsage] = useState<Usage | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setUsage(await request("/api/storage"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <section className="backup-settings">
      <Link href="/admin/settings">← Back to settings</Link>
      <h1>Storage use</h1>
      <h2>Your garden’s growing collection</h2>
      {busy && <p role="status">Measuring storage…</p>}
      {usage && (
        <>
          <p>
            {bytes(usage.total)} in object storage{" "}
            {error ? "· Last confirmed value is stale" : ""}
          </p>
          {[
            ["Original photos", usage.originals],
            ["Display copies", usage.display],
            ["Backup archives", usage.archives],
            ["Temporary uploads", usage.staging],
          ].map(([label, value]) => (
            <div className="settings-card" key={label}>
              <h3>{label}</h3>
              <p>{bytes(Number(value))}</p>
            </div>
          ))}
          <p className="muted">
            Updated {new Date(usage.measuredAt).toLocaleString()} ·{" "}
            {usage.source}
          </p>
          <div className="settings-card">
            <h3>Database</h3>
            <p>{bytes(usage.databaseBytes)}</p>
            <p className="muted">{usage.databaseSource}</p>
          </div>
          <p className="muted">
            These measurements are separate from provider billing. Plan and
            quota information is unavailable here.{" "}
            <a
              href="https://console.neon.tech/"
              target="_blank"
              rel="noreferrer"
            >
              View provider dashboard ↗
            </a>
          </p>
        </>
      )}
      {error && (
        <div className="settings-card error" role="alert">
          <h3>Could not refresh usage</h3>
          <p>
            {error}{" "}
            {usage
              ? "Showing the last confirmed value."
              : "Storage usage is unavailable."}
          </p>
        </div>
      )}
      <button
        className="secondary"
        disabled={busy}
        onClick={() => void refresh()}
      >
        {error ? "Retry refresh" : "Refresh usage"}
      </button>
    </section>
  );
}
