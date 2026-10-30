"use client";
import { useEffect, useRef, useState } from "react";
import type { GardenPage } from "@/lib/pages";
import { uuid, type PageDetails } from "@/lib/organization";
// Use the same namespace and sign-out event as the shared editor recovery flow.
const recoveryPrefix = (accountId: string) =>
  "garden-recovery:" + encodeURIComponent(accountId) + ":";
const logoutSignal = "garden-signout";
const fields = ["date", "categoryId", "coverPhotoId"] as const;
const same = (a: PageDetails, b: PageDetails) =>
  fields.every((key) => a[key] === b[key]);
export const detailsOf = (page: GardenPage): PageDetails => ({
  date: page.page_date?.slice(0, 10) ?? null,
  categoryId: page.category_id ?? null,
  coverPhotoId: page.cover_photo_id ?? null,
});
function validDetails(value: unknown): value is PageDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as PageDetails;
  return fields.every(
    (key) =>
      details[key] === null ||
      (typeof details[key] === "string" &&
        (key === "date"
          ? /^\d{4}-\d{2}-\d{2}$/.test(details[key])
          : uuid.test(details[key]))),
  );
}
export function usePageDetails(
  page: GardenPage,
  accountId: string,
  onSaved: (page: GardenPage) => void,
) {
  const initial = detailsOf(page);
  const state = useRef({
    active: false,
    initialized: false,
    epoch: 0,
    base: initial,
    working: initial,
    version: page.metadata_version ?? 0,
    saving: false,
    key: "",
    written: null as string | null,
    comparison: null as GardenPage | null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    callback = useRef(onSaved);
  callback.current = onSaved;
  const [details, setDetails] = useState(initial),
    [status, setStatus] = useState("Saved"),
    [error, setError] = useState(""),
    [warning, setWarning] = useState(""),
    [recovered, setRecovered] = useState(false),
    [comparison, setComparison] = useState<GardenPage | null>(null);
  function cancelTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function apply(next: PageDetails) {
    state.current.working = next;
    setDetails(next);
  }
  function writeRecovery() {
    const s = state.current;
    if (!s.active || !s.key) return;
    try {
      const record = JSON.stringify({
        schemaVersion: "page-details-1",
        accountId,
        pageId: page.id,
        metadataVersion: s.version,
        baseDetails: s.base,
        details: s.working,
        savedAt: new Date().toISOString(),
      });
      if (record.length > 8192) throw Error();
      localStorage.setItem(s.key, record);
      s.written = record;
      setWarning("");
    } catch {
      setWarning(
        "Device recovery is unavailable. Keep this editor open until page details are saved.",
      );
    }
  }
  function clearAcknowledged() {
    const s = state.current;
    try {
      if (localStorage.getItem(s.key) === s.written)
        localStorage.removeItem(s.key);
      s.written = null;
    } catch {}
  }
  function stop() {
    const s = state.current;
    s.active = false;
    s.epoch++;
    cancelTimer();
    try {
      for (const key of Object.keys(localStorage))
        if (key.startsWith(recoveryPrefix(accountId)))
          localStorage.removeItem(key);
    } catch {}
  }
  async function persist() {
    const s = state.current;
    if (!s.active || s.saving || s.comparison || same(s.working, s.base))
      return;
    cancelTimer();
    s.saving = true;
    const submitted = s.working,
      epoch = s.epoch;
    setStatus("Autosaving…");
    setError("");
    let again = false;
    try {
      const r = await fetch("/api/pages/" + page.id + "/details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submitted, metadataVersion: s.version }),
      });
      const result = await r.json();
      if (!s.active || epoch !== s.epoch) return;
      if (r.status === 401 || r.status === 403) {
        stop();
        window.location.assign("/login");
        return;
      }
      if (r.status === 409) {
        const response = await fetch("/api/pages/" + page.id);
        const saved: GardenPage = await response.json();
        if (!s.active || epoch !== s.epoch) return;
        if (!response.ok)
          throw Error(
            "Could not load the saved page details. Retry when connected.",
          );
        const remote = detailsOf(saved),
          merged = { ...s.working };
        let conflict = false;
        for (const key of fields) {
          if (s.working[key] === s.base[key]) merged[key] = remote[key];
          else if (
            remote[key] !== s.base[key] &&
            remote[key] !== s.working[key]
          )
            conflict = true;
        }
        if (conflict) {
          apply(merged);
          s.comparison = saved;
          setComparison(saved);
          setStatus("Conflict · unsaved");
          writeRecovery();
          return;
        }
        s.base = remote;
        s.version = saved.metadata_version ?? 0;
        apply(merged);
        if (same(merged, remote)) {
          clearAcknowledged();
          setRecovered(false);
          setStatus("Saved");
        } else {
          writeRecovery();
          again = true;
        }
        return;
      }
      if (!r.ok) throw Error(result.error ?? "Could not save page details.");
      s.base = detailsOf(result);
      s.version = result.metadata_version;
      callback.current(result);
      setError("");
      if (same(s.working, s.base)) {
        clearAcknowledged();
        setRecovered(false);
        setStatus("Saved");
        setWarning("");
      } else {
        writeRecovery();
        again = true;
      }
    } catch (e) {
      if (!s.active || epoch !== s.epoch) return;
      setStatus("Unsaved · Retry");
      setError(
        e instanceof Error
          ? e.message
          : "Could not save page details. Your changes are still here.",
      );
      writeRecovery();
    } finally {
      if (epoch === s.epoch) s.saving = false;
      if (again && s.active)
        timer.current = setTimeout(() => void persist(), 650);
    }
  }
  useEffect(() => {
    const s = state.current;
    s.active = true;
    if (!s.initialized) {
      s.initialized = true;
      s.key = recoveryPrefix(accountId) + page.id + ":details";
      try {
        const raw = localStorage.getItem(s.key);
        const record = raw && raw.length <= 8192 ? JSON.parse(raw) : null;
        if (
          record?.schemaVersion === "page-details-1" &&
          record.accountId === accountId &&
          record.pageId === page.id &&
          Number.isSafeInteger(record.metadataVersion) &&
          record.metadataVersion >= 0 &&
          validDetails(record.baseDetails) &&
          validDetails(record.details)
        ) {
          s.written = raw;
          if (same(record.details, initial)) clearAcknowledged();
          else {
            s.base = record.baseDetails;
            s.version = record.metadataVersion;
            apply(record.details);
            setRecovered(true);
            setStatus("Recovered · unsaved");
          }
        }
      } catch {
        setWarning(
          "Device recovery is unavailable. Keep this editor open until page details are saved.",
        );
      }
    }
    function localLogout(event: Event) {
      if ((event as CustomEvent).detail === accountId) stop();
    }
    function remoteLogout(event: StorageEvent) {
      if (event.key !== logoutSignal || !event.newValue) return;
      try {
        if (JSON.parse(event.newValue).accountId === accountId) {
          stop();
          window.location.assign("/login");
        }
      } catch {}
    }
    window.addEventListener(logoutSignal, localLogout);
    window.addEventListener("storage", remoteLogout);
    return () => {
      s.active = false;
      s.epoch++;
      s.saving = false;
      cancelTimer();
      window.removeEventListener(logoutSignal, localLogout);
      window.removeEventListener("storage", remoteLogout);
    };
    // This lifetime belongs to one authenticated account and page; callbacks read its refs.
  }, [page.id, accountId]);
  function change(changes: Partial<PageDetails>) {
    const s = state.current;
    if (!s.active) return;
    apply({ ...s.working, ...changes });
    cancelTimer();
    setError("");
    if (s.comparison) {
      setComparison({ ...s.comparison });
      setStatus("Conflict · unsaved");
      writeRecovery();
      return;
    }
    if (!s.saving && same(s.working, s.base)) {
      clearAcknowledged();
      setRecovered(false);
      setStatus("Saved");
      return;
    }
    writeRecovery();
    setStatus("Autosaving…");
    timer.current = setTimeout(() => void persist(), 650);
  }
  function resolve(keepLocal: boolean) {
    const s = state.current;
    if (!s.active || !s.comparison) return;
    const saved = s.comparison;
    s.base = detailsOf(saved);
    s.version = saved.metadata_version ?? 0;
    s.comparison = null;
    setComparison(null);
    setError("");
    if (!keepLocal) apply(s.base);
    if (same(s.working, s.base)) {
      clearAcknowledged();
      setRecovered(false);
      setStatus("Saved");
    } else {
      writeRecovery();
      setStatus("Autosaving…");
      timer.current = setTimeout(() => void persist(), 0);
    }
  }
  return {
    details,
    status,
    error,
    warning,
    recovered,
    comparison,
    change,
    retry: () => void persist(),
    resolve,
  };
}
