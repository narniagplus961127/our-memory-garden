"use client";
import { useEffect, useRef, useState } from "react";
import type { GardenPage } from "@/lib/pages";
import { slotNames, slotContent, type PageBlock } from "@/lib/blocks";
import {
  snapshot,
  equal,
  mergePage,
  type PageSnapshot,
  type MergeResult,
} from "@/lib/page-merge";
import {
  clearAccountRecovery,
  logoutSignal,
  parseRecovery,
  recoveryPrefix,
  type RecoveryRecord,
} from "@/lib/editor-recovery";
type Comparison = {
  base: PageSnapshot;
  saved: GardenPage;
  result: MergeResult;
  choices: Record<string, "local" | "saved">;
};
export function usePageAutosave(page: GardenPage, accountId: string) {
  const initial = snapshot(page);
  const state = useRef({
    base: initial,
    version: page.version,
    working: initial,
    seq: 0,
    session: "",
    key: "",
    active: false,
    initialized: false,
    saving: false,
    comparison: null as Comparison | null,
    reason: "edit",
    source: null as { key: string; value: string | null } | null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [working, setWorking] = useState(initial),
    [status, setStatus] = useState("Saved"),
    [error, setError] = useState(""),
    [warning, setWarning] = useState(""),
    [recovered, setRecovered] = useState(false),
    [comparison, setComparison] = useState<Comparison | null>(null),
    [copies, setCopies] = useState<
      Array<{ key: string; record: RecoveryRecord }>
    >([]);
  function cancelTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function writeRecovery() {
    const s = state.current;
    if (!s.active || !s.key) return;
    const record: RecoveryRecord = {
      schemaVersion: 1,
      accountId,
      pageId: page.id,
      editorSessionId: s.session,
      baseVersion: s.version,
      baseSnapshot: s.base,
      workingSnapshot: s.working,
      editSeq: s.seq,
      savedAt: new Date().toISOString(),
      reason: s.reason === "resolution" ? "resolution" : "edit",
      comparison: s.comparison
        ? { baseSnapshot: s.comparison.base, saved: s.comparison.saved }
        : undefined,
    };
    try {
      const json = JSON.stringify(record);
      if (json.length > 1000000) throw new Error();
      localStorage.setItem(s.key, json);
      setWarning("");
    } catch {
      setWarning(
        "Device recovery is unavailable. Keep this editor open until your changes are saved.",
      );
    }
  }
  function clearAcknowledged() {
    const s = state.current;
    try {
      localStorage.removeItem(s.key);
      if (s.source && localStorage.getItem(s.source.key) === s.source.value)
        localStorage.removeItem(s.source.key);
      s.source = null;
    } catch {}
  }
  function apply(next: PageSnapshot) {
    state.current.working = next;
    setWorking(next);
  }
  function showComparison(base: PageSnapshot, saved: GardenPage) {
    const s = state.current,
      result = mergePage(base, s.working, snapshot(saved));
    apply(result.draft);
    if (!result.conflicts.length) {
      s.base = snapshot(saved);
      s.version = saved.version;
      s.comparison = null;
      s.reason = "resolution";
      setComparison(null);
      setStatus("Saving…");
      setError("");
      writeRecovery();
      cancelTimer();
      timer.current = setTimeout(() => void persist(), 650);
      return;
    }
    s.comparison = { base, saved, result, choices: {} };
    setComparison(s.comparison);
    setStatus("Conflict · unsaved");
    setError("");
    writeRecovery();
  }
  async function persist() {
    const s = state.current;
    if (
      !s.active ||
      s.saving ||
      s.comparison ||
      (equal(s.working, s.base) && s.reason !== "resolution")
    )
      return;
    cancelTimer();
    if (!s.working.title.trim()) {
      setStatus("Not saved");
      setError("Enter a page title.");
      return;
    }
    const submitted = s.working,
      version = s.version;
    s.saving = true;
    setStatus("Saving…");
    setError("");
    let again = false;
    try {
      const response = await fetch("/api/pages/" + page.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...submitted,
          version,
          accountId,
          editorSessionId: s.session,
          reason: s.reason,
        }),
      });
      const result = await response.json();
      if (!s.active) return;
      if (response.status === 401 || response.status === 403) {
        stop();
        clearAccountRecovery(accountId);
        window.location.assign("/login");
        return;
      }
      if (response.status === 409 && result.kind === "conflict") {
        showComparison(result.base, result.saved);
        return;
      }
      if (!response.ok)
        throw new Error(result.error ?? "Could not save your changes.");
      const saved = snapshot(result);
      const merged = mergePage(submitted, s.working, saved);
      s.base = saved;
      s.version = result.version;
      s.reason = "edit";
      if (merged.conflicts.length) {
        showComparison(submitted, result);
        return;
      }
      apply(merged.draft);
      if (equal(s.working, s.base)) {
        clearAcknowledged();
        setRecovered(false);
        setStatus("Saved");
        setWarning("");
      } else {
        writeRecovery();
        setStatus("Saving…");
        again = true;
      }
    } catch (cause) {
      if (!s.active) return;
      setStatus("Not saved");
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not connect. Your changes are still here.",
      );
      writeRecovery();
    } finally {
      s.saving = false;
      if (again && s.active) void persist();
    }
  }
  function stop() {
    state.current.active = false;
    cancelTimer();
    state.current.comparison = null;
    setComparison(null);
    setStatus("Signed out");
  }
  function restore(record: RecoveryRecord) {
    const s = state.current;
    s.base = record.baseSnapshot;
    s.version = record.baseVersion;
    s.seq = record.editSeq + 1;
    s.reason = record.reason ?? "edit";
    apply(record.workingSnapshot);
    s.comparison = null;
    setComparison(null);
    setRecovered(true);
    setStatus("Recovered unsaved");
    setError("");
    if (record.comparison) showComparison(record.comparison.baseSnapshot, page);
    writeRecovery();
    cancelTimer();
    timer.current = setTimeout(() => void persist(), 650);
  }
  useEffect(() => {
    const s = state.current;
    s.active = true;
    if (!s.initialized) {
      s.initialized = true;
      const sessionKey = "garden-editor-session:" + accountId + ":" + page.id;
      try {
        s.session = sessionStorage.getItem(sessionKey) ?? crypto.randomUUID();
        sessionStorage.setItem(sessionKey, s.session);
      } catch {
        s.session = crypto.randomUUID();
      }
      s.key = recoveryPrefix(accountId) + page.id + ":" + s.session;
      try {
        const own = parseRecovery(
          localStorage.getItem(s.key),
          accountId,
          page.id,
        );
        if (own) restore(own);
        const prefix = recoveryPrefix(accountId) + page.id + ":";
        setCopies(
          Object.keys(localStorage)
            .filter((key) => key.startsWith(prefix) && key !== s.key)
            .flatMap((key) => {
              const record = parseRecovery(
                localStorage.getItem(key),
                accountId,
                page.id,
              );
              return record ? [{ key, record }] : [];
            }),
        );
      } catch {
        setWarning(
          "Device recovery is unavailable. Keep this editor open until your changes are saved.",
        );
      }
    }
    if (!equal(s.working, s.base) && !s.comparison)
      timer.current = setTimeout(() => void persist(), 650);
    function localLogout(event: Event) {
      if ((event as CustomEvent).detail === accountId) {
        stop();
        clearAccountRecovery(accountId);
      }
    }
    function remoteLogout(event: StorageEvent) {
      if (event.key !== logoutSignal || !event.newValue) return;
      try {
        if (JSON.parse(event.newValue).accountId === accountId) {
          stop();
          clearAccountRecovery(accountId);
          window.location.assign("/login");
        }
      } catch {}
    }
    function online() {
      if (!s.comparison) void persist();
    }
    window.addEventListener(logoutSignal, localLogout);
    window.addEventListener("storage", remoteLogout);
    window.addEventListener("online", online);
    return () => {
      s.active = false;
      cancelTimer();
      window.removeEventListener(logoutSignal, localLogout);
      window.removeEventListener("storage", remoteLogout);
      window.removeEventListener("online", online);
    };
    // Refs keep asynchronous callbacks on this mounted page/account's newest draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, accountId]);
  function change(changes: Partial<PageSnapshot>) {
    const s = state.current;
    if (!s.active) return;
    const next = { ...s.working, ...changes };
    if (equal(next, s.working)) return;
    s.seq++;
    apply(next);
    cancelTimer();
    if (s.comparison) {
      const c = s.comparison;
      c.choices = {};
      c.result = mergePage(c.base, next, snapshot(c.saved));
      if (!c.result.conflicts.length) {
        showComparison(c.base, c.saved);
        return;
      }
      setComparison({ ...c });
      setStatus("Conflict · unsaved");
      writeRecovery();
      return;
    }
    if (!s.saving && equal(next, s.base)) {
      try {
        localStorage.removeItem(s.key);
      } catch {}
      setStatus("Saved");
      setError("");
      setRecovered(false);
      return;
    }
    writeRecovery();
    setStatus("Saving…");
    setError("");
    timer.current = setTimeout(() => void persist(), 650);
  }
  function editConflictText(key: string, text: string) {
    const s = state.current,
      c = s.comparison;
    const conflict = c?.result.conflicts.find((item) => item.key === key);
    if (!s.active || !c || !conflict?.blockId) return;
    function walk(blocks: PageBlock[]): PageBlock[] {
      return blocks.map((block) => {
        if (block.props.id === conflict!.blockId)
          return { ...block, props: { ...block.props, text } };
        const props = { ...block.props };
        for (const slot of slotNames(block.type))
          props[slot] = walk(slotContent(block, slot));
        return { ...block, props };
      });
    }
    apply({
      ...s.working,
      content: {
        root: { props: {} },
        content: walk(s.working.content.content),
      },
    });
    c.result = {
      ...c.result,
      draft: s.working,
      conflicts: c.result.conflicts.map((item) =>
        item.key === key
          ? {
              ...item,
              local: {
                ...(item.local as PageBlock),
                props: { ...(item.local as PageBlock).props, text },
              },
            }
          : item,
      ),
    };
    s.seq++;
    setComparison({ ...c });
    writeRecovery();
  }
  function resolve(key: string, side: "local" | "saved") {
    const s = state.current,
      c = s.comparison;
    if (!s.active || !c) return;
    c.choices = { ...c.choices, [key]: side };
    c.result = mergePage(c.base, s.working, snapshot(c.saved), c.choices);
    apply(c.result.draft);
    s.seq++;
    if (c.result.conflicts.length) {
      setComparison({ ...c });
      writeRecovery();
      return;
    }
    s.base = snapshot(c.saved);
    s.version = c.saved.version;
    s.comparison = null;
    s.reason = "resolution";
    setComparison(null);
    writeRecovery();
    setStatus("Saving…");
    void persist();
  }
  return {
    working,
    status,
    error,
    warning,
    recovered,
    comparison,
    copies,
    change,
    editConflictText,
    retry: () => void persist(),
    resolve,
    recover: (key: string) => {
      const copy = copies.find((c) => c.key === key);
      if (copy) {
        try {
          state.current.source = { key, value: localStorage.getItem(key) };
        } catch {}
        restore(copy.record);
        setCopies(copies.filter((c) => c.key !== key));
      }
    },
    discard: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch {}
      setCopies(copies.filter((c) => c.key !== key));
    },
  };
}
