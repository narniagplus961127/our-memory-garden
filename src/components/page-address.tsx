"use client";
import { useEffect, useRef, useState } from "react";
import type { GardenPage } from "@/lib/pages";
import {
  clearAccountRecovery,
  logoutSignal,
  recoveryPrefix,
} from "@/lib/editor-recovery";
type AddressCopy = {
  schemaVersion: 1;
  kind: "address";
  accountId: string;
  pageId: string;
  editorSessionId: string;
  expectedSlug: string;
  slug: string;
  source?: { key: string; value: string };
};
const validSlug = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 100 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export function PageAddress({
  page,
  accountId,
}: {
  page: GardenPage;
  accountId: string;
}) {
  const [slug, setSlug] = useState(page.slug),
    [saved, setSaved] = useState(page.slug),
    [status, setStatus] = useState("Saved"),
    [error, setError] = useState(""),
    [warning, setWarning] = useState(""),
    [conflict, setConflict] = useState<string | null>(null),
    [copies, setCopies] = useState<string[]>([]);
  const state = useRef({
    active: false,
    initialized: false,
    busy: false,
    key: "",
    session: "",
    slug: page.slug,
    saved: page.slug,
    conflict: null as string | null,
    source: undefined as AddressCopy["source"],
  });
  const prefix = recoveryPrefix(accountId) + page.id + ":address:";
  function parse(value: string | null): AddressCopy | null {
    try {
      if (!value || value.length > 4096) return null;
      const copy = JSON.parse(value);
      return copy.schemaVersion === 1 &&
        copy.kind === "address" &&
        copy.accountId === accountId &&
        copy.pageId === page.id &&
        typeof copy.editorSessionId === "string" &&
        /^[\w-]{1,120}$/.test(copy.editorSessionId) &&
        validSlug(copy.expectedSlug) &&
        typeof copy.slug === "string" &&
        copy.slug.length <= 100 &&
        (!copy.source ||
          (typeof copy.source.key === "string" &&
            copy.source.key.startsWith(prefix) &&
            typeof copy.source.value === "string" &&
            copy.source.value.length <= 4096))
        ? copy
        : null;
    } catch {
      return null;
    }
  }
  function clearCopy() {
    const s = state.current;
    try {
      localStorage.removeItem(s.key);
      if (s.source && localStorage.getItem(s.source.key) === s.source.value)
        localStorage.removeItem(s.source.key);
      s.source = undefined;
    } catch {}
  }
  function retain() {
    const s = state.current;
    if (!s.active || !s.key) return;
    if (!s.busy && s.slug === s.saved) {
      clearCopy();
      return;
    }
    try {
      const copy: AddressCopy = {
        schemaVersion: 1,
        kind: "address",
        accountId,
        pageId: page.id,
        editorSessionId: s.session,
        expectedSlug: s.saved,
        slug: s.slug,
        source: s.source,
      };
      const value = JSON.stringify(copy);
      if (value.length > 4096) throw Error();
      localStorage.setItem(s.key, value);
      setWarning("");
    } catch {
      setWarning(
        "Device recovery is unavailable. Keep this editor open until the address is saved.",
      );
    }
  }
  function acknowledge(current: string) {
    const s = state.current;
    s.saved = current;
    setSaved(current);
    setError("");
    if (s.slug === current) {
      clearCopy();
      setStatus("Saved");
    } else {
      retain();
      setStatus("Unsaved");
    }
  }
  function restore(copy: AddressCopy, source = copy.source) {
    const s = state.current;
    const current = s.saved;
    s.source = source;
    if (copy.slug === current) {
      clearCopy();
      return;
    }
    s.slug = copy.slug;
    s.saved = copy.expectedSlug;
    s.conflict = current !== copy.expectedSlug ? current : null;
    setSlug(s.slug);
    setSaved(s.saved);
    setConflict(s.conflict);
    setStatus(
      s.conflict === null
        ? "Recovered · unsaved"
        : "Address conflict · unsaved",
    );
    setError("");
    retain();
  }
  async function persist() {
    const s = state.current;
    if (!s.active || s.busy || s.conflict !== null || s.slug === s.saved)
      return;
    if (!validSlug(s.slug)) {
      setError("Use lowercase letters, numbers and single hyphens.");
      setStatus("Not saved");
      return;
    }
    s.busy = true;
    setStatus("Saving…");
    const submitted = s.slug,
      expectedSlug = s.saved;
    try {
      const r = await fetch("/api/pages/" + page.id + "/address", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: submitted, expectedSlug }),
      });
      const data = await r.json();
      if (!s.active) return;
      if (r.status === 401 || r.status === 403) {
        stop();
        clearAccountRecovery(accountId);
        window.location.assign("/login");
        return;
      }
      if (r.status === 409) {
        const current = await fetch("/api/pages/" + page.id);
        const live = await current.json();
        if (!s.active) return;
        if (current.ok && validSlug(live.slug)) {
          if (live.slug === submitted) {
            acknowledge(live.slug);
            return;
          }
          if (live.slug !== expectedSlug) {
            s.conflict = live.slug;
            setConflict(live.slug);
            setStatus("Address conflict · unsaved");
            setError("");
            return;
          }
        }
      }
      if (!r.ok) throw Error(data.error);
      acknowledge(data.slug);
    } catch (e) {
      if (!s.active) return;
      setStatus("Not saved");
      setError(
        e instanceof Error
          ? e.message
          : "Could not change the address. Your entry is still here.",
      );
      retain();
    } finally {
      s.busy = false;
    }
  }
  function stop() {
    state.current.active = false;
    setStatus("Signed out");
  }
  useEffect(() => {
    const s = state.current;
    s.active = true;
    if (!s.initialized) {
      s.initialized = true;
      try {
        const sessionKey = "garden-editor-session:" + accountId + ":" + page.id;
        s.session = sessionStorage.getItem(sessionKey) ?? crypto.randomUUID();
        sessionStorage.setItem(sessionKey, s.session);
        s.key = prefix + s.session;
        const own = parse(localStorage.getItem(s.key));
        if (own) restore(own);
        setCopies(
          Object.keys(localStorage).filter(
            (key) =>
              key.startsWith(prefix) &&
              key !== s.key &&
              key !== s.source?.key &&
              parse(localStorage.getItem(key)),
          ),
        );
      } catch {
        setWarning(
          "Device recovery is unavailable. Keep this editor open until the address is saved.",
        );
      }
    }
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
    window.addEventListener(logoutSignal, localLogout);
    window.addEventListener("storage", remoteLogout);
    return () => {
      s.active = false;
      window.removeEventListener(logoutSignal, localLogout);
      window.removeEventListener("storage", remoteLogout);
    };
    // Refs retain the current address while asynchronous responses are pending.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, accountId]);
  useEffect(() => {
    if (slug === saved || conflict !== null) return;
    const timer = setTimeout(() => void persist(), 650);
    return () => clearTimeout(timer);
  }, [slug, saved, conflict]);
  const canRecover =
    state.current.active &&
    !state.current.busy &&
    slug === saved &&
    conflict === null;
  return (
    <div className="page-address field">
      <label htmlFor="page-address">Page address</label>
      <input
        id="page-address"
        value={slug}
        maxLength={100}
        onChange={(e) => {
          const s = state.current;
          if (!s.active) return;
          s.slug = e.target.value;
          setSlug(s.slug);
          setStatus(
            s.conflict !== null
              ? "Address conflict · unsaved"
              : s.slug === s.saved
                ? "Saved"
                : "Unsaved",
          );
          setError("");
          retain();
        }}
        onBlur={() => void persist()}
        aria-invalid={Boolean(error)}
        aria-describedby="address-note"
      />
      <p id="address-note" className="muted">
        <small>
          /garden/{slug}
          <br />
          Changing this removes the old address. Previously shared address links
          stop working. Garden links keep working.
        </small>
      </p>
      <span role="status" aria-label="Address status">
        {status}
      </span>
      {warning && <p role="alert">{warning}</p>}
      {conflict !== null && (
        <div className="editor-recovery-notice">
          <p>
            The saved address is /garden/{conflict}. Your unsaved address is
            /garden/{slug}.
          </p>
          <button
            className="secondary"
            onClick={() => {
              const s = state.current;
              if (!s.active || s.busy) return;
              s.saved = conflict;
              s.conflict = null;
              setSaved(conflict);
              setConflict(null);
              retain();
              setStatus(s.slug === s.saved ? "Saved" : "Unsaved");
            }}
          >
            Keep my address
          </button>
          <button
            className="secondary"
            onClick={() => {
              const s = state.current;
              if (!s.active || s.busy) return;
              s.slug = conflict;
              s.conflict = null;
              setSlug(conflict);
              setConflict(null);
              acknowledge(conflict);
            }}
          >
            Use saved address
          </button>
        </div>
      )}
      {copies.map((key) => (
        <div className="editor-recovery-notice" key={key}>
          <p>Another device copy has an unsaved page address.</p>
          <button
            className="secondary"
            disabled={!canRecover}
            onClick={() => {
              const s = state.current;
              if (
                !s.active ||
                s.busy ||
                s.slug !== s.saved ||
                s.conflict !== null
              )
                return;
              try {
                const value = localStorage.getItem(key),
                  copy = parse(value);
                if (!copy || !value) return;
                restore(copy, { key, value });
                setCopies((current) => current.filter((item) => item !== key));
              } catch {}
            }}
          >
            Recover address device copy
          </button>
          {!canRecover && (
            <p>
              Save or resolve your current address before recovering another
              copy.
            </p>
          )}
        </div>
      ))}
      {error && (
        <>
          <p role="alert" className="error">
            {error}
          </p>
          <button className="secondary" onClick={() => void persist()}>
            Retry address
          </button>
        </>
      )}
    </div>
  );
}
