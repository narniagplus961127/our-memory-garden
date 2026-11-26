"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Link from "next/link";

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
async function request(path: string) {
  const response = await fetch(path, {
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Could not complete the request. Please retry.",
    );
  return data;
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
    <section className="storage-settings">
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
            ["Temporary archives", usage.archives],
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
      <Button
        className="secondary"
        disabled={busy}
        onClick={() => void refresh()}
      >
        {error ? "Retry refresh" : "Refresh usage"}
      </Button>
    </section>
  );
}
