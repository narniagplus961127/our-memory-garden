"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Toast } from "./toast";
import { usageBytes, type UsageOverview } from "@/lib/usage";
import styles from "./usage-settings.module.css";

async function loadUsage(signal?: AbortSignal): Promise<UsageOverview> {
  const response = await fetch("/api/usage", { cache: "no-store", signal });
  if (!response.ok) throw new Error("Could not load usage. Please try again.");
  return response.json();
}
export function UsageWarning() {
  const path = usePathname(),
    checked = useRef(0);
  const [warnings, setWarnings] = useState(0);
  useEffect(() => {
    if (
      path === "/admin/settings/usage" ||
      Date.now() - checked.current < 60000
    )
      return;
    const controller = new AbortController();
    loadUsage(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setWarnings(data.alerts.length);
          checked.current = Date.now();
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [path]);
  if (!warnings || path === "/admin/settings/usage") return null;
  return (
    <div
      className="mb-5 flex items-center gap-3 rounded-md border border-amber-600/30 bg-amber-50 p-3 text-sm"
      role="status"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <Link
        href="/admin/settings/usage"
        className="underline underline-offset-4"
      >
        {warnings === 1
          ? "A usage warning needs your attention"
          : `${warnings} usage warnings need your attention`}
      </Link>
    </div>
  );
}

export function UsageSettings() {
  const [data, setData] = useState<UsageOverview | null>(null),
    [busy, setBusy] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [daily, setDaily] = useState("250"),
    [monthly, setMonthly] = useState("8"),
    [errors, setErrors] = useState("10"),
    [requests, setRequests] = useState("10000");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    setError("");
    try {
      const next = await loadUsage(signal);
      if (signal?.aborted) return;
      setData(next);
      setDaily(String(next.settings.dailyBytes / 1e6));
      setMonthly(String(next.settings.monthlyBytes / 1e9));
      setErrors(String(next.settings.errorPercent));
      setRequests(String(next.settings.hourlyRequests));
    } catch (failure) {
      if (!signal?.aborted) setError((failure as Error).message);
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/usage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyBytes: Math.round(Number(daily) * 1e6),
          monthlyBytes: Math.round(Number(monthly) * 1e9),
          errorPercent: Number(errors),
          hourlyRequests: Number(requests),
          version: data.settings.version,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
      setNotice("Usage warning levels saved.");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className={`${styles.root} grid max-w-6xl gap-6`}>
      <div>
        <Link href="/admin/settings">← Back to settings</Link>
        <h1 className="mt-4">Usage & alerts</h1>
        <p className="muted">
          Keep an eye on photo traffic and catch unusual growth.
        </p>
      </div>
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">Loading usage…</p>}
      {data && (
        <>
          {data.alerts.map((message) => (
            <div
              key={message}
              role="alert"
              className="flex gap-3 rounded-lg border border-amber-600/30 bg-amber-50 p-4"
            >
              <AlertTriangle className="size-5 shrink-0" />
              <span>{message}</span>
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Today · UTC", data.today.bytes, data.settings.dailyBytes],
              [
                "This month · UTC",
                data.month.bytes,
                data.settings.monthlyBytes,
              ],
            ].map(([label, value, budget]) => (
              <div
                className="usage-stat rounded-lg border bg-card p-5"
                key={label}
              >
                <h2 className="mb-3 font-sans text-sm font-medium">
                  {String(label)}
                </h2>
                <p className="text-2xl font-semibold">
                  ≈ {usageBytes(Number(value))}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Warning at {usageBytes(Number(budget))}
                </p>
              </div>
            ))}
            <div className="usage-stat rounded-lg border bg-card p-5">
              <h2 className="mb-3 font-sans text-sm font-medium">
                Origin requests this month
              </h2>
              <p className="text-2xl font-semibold">
                ≈ {data.month.requests.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Based on {data.month.samples.toLocaleString()} sampled responses
              </p>
            </div>
          </div>
          <details className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              About these estimates
            </summary>
            <div className="mt-3">
              <p>
                Estimates cover photo and backup responses served by the app,
                sampled 1 in {data.sampleEvery}. They exclude CDN hits, other
                website traffic and database transfer. Small samples can vary
                widely, and interrupted downloads may count their full response
                size.
              </p>
              <p className="mt-2">
                These figures are not Vercel Fast Origin Transfer or your bill.
                Warning levels are your own preferences, not provider limits.
                In-app warnings need at least five samples for traffic, or ten
                for server errors.
              </p>
              <p className="mt-2">
                Tracking started{" "}
                {new Date(data.settings.startedAt).toLocaleDateString("en-GB")}.
                Updated {new Date(data.measuredAt).toLocaleString()}.
              </p>
            </div>
          </details>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-lg border bg-card p-5">
              <h2 className="mb-4 text-xl">Last seven days</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 text-start">Date · UTC</th>
                      <th className="text-end">Estimated transfer</th>
                      <th className="text-end">Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.days.map((day) => (
                      <tr className="border-b last:border-0" key={day.day}>
                        <td className="py-3">
                          <time dateTime={day.day}>
                            {new Date(
                              day.day + "T00:00:00Z",
                            ).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              timeZone: "UTC",
                            })}
                          </time>
                        </td>
                        <td className="text-end">≈ {usageBytes(day.bytes)}</td>
                        <td className="text-end">{day.samples}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-4 text-xl">Traffic by type this month</h2>
              {data.kinds.length ? (
                <ul className="grid gap-3">
                  {data.kinds.map((kind) => (
                    <li
                      className="flex justify-between gap-3 border-b pb-3"
                      key={kind.kind}
                    >
                      <span className="capitalize">{kind.kind}</span>
                      <span>≈ {usageBytes(kind.bytes)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No traffic samples yet. Tracking begins with photo and backup
                  requests after this update.
                </p>
              )}
              <p className="mt-5 text-sm text-muted-foreground">
                Current hour · ≈ {data.recent.errors} server errors from ≈{" "}
                {data.recent.requests} requests ({data.recent.samples} samples).
                Revalidated browser copies count as requests with no image body
                transfer.
              </p>
            </div>
          </div>
          <form
            onSubmit={save}
            className="grid gap-4 rounded-lg border bg-card p-5"
          >
            <div>
              <h2 className="text-xl">Warning levels</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Warnings appear here and in the admin area. These settings do
                not stop traffic or send emails.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="usage-daily">Daily transfer · MB</Label>
                <Input
                  id="usage-daily"
                  type="number"
                  min="1"
                  max="10000000"
                  step="any"
                  required
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  disabled={busy || saving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="usage-monthly">Monthly transfer · GB</Label>
                <Input
                  id="usage-monthly"
                  type="number"
                  min="0.001"
                  max="100000"
                  step="any"
                  required
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  disabled={busy || saving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="usage-errors">Server errors · % per hour</Label>
                <Input
                  id="usage-errors"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={errors}
                  onChange={(e) => setErrors(e.target.value)}
                  disabled={busy || saving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="usage-requests">
                  Origin requests · per hour
                </Label>
                <Input
                  id="usage-requests"
                  type="number"
                  min="100"
                  max="1000000000"
                  required
                  value={requests}
                  onChange={(e) => setRequests(e.target.value)}
                  disabled={busy || saving}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="justify-self-start"
              disabled={busy || saving}
            >
              {saving ? "Saving…" : "Save warning levels"}
            </Button>
          </form>
        </>
      )}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-xl">Provider usage & notifications</h2>
        <p className="my-3 text-sm text-muted-foreground">
          Check your providers for actual allowances, billed transfer and
          account-wide usage. Vercel supplies usage-limit notifications
          automatically; detailed anomaly alerts require a paid add-on. Check
          that your notification preferences are enabled.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a
              href="https://vercel.com/qw-e7b7/~/usage"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel usage <ExternalLink />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://console.neon.tech/app/projects/summer-thunder-00740472"
              target="_blank"
              rel="noopener noreferrer"
            >
              Neon usage <ExternalLink />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://vercel.com/account/notifications"
              target="_blank"
              rel="noopener noreferrer"
            >
              Notification preferences <ExternalLink />
            </a>
          </Button>
        </div>
      </div>
      <Button
        variant="outline"
        className="justify-self-start"
        disabled={busy || saving}
        onClick={() => void refresh()}
      >
        Refresh usage
      </Button>
    </section>
  );
}
