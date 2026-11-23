"use client";
import { useEffect, useRef, useState, type SetStateAction } from "react";
import {
  defaultMediaBrowse,
  readMediaBrowse,
  mediaBrowseKey,
  clearMediaBrowse,
  type MediaBrowseRecord,
  type MediaBrowseSettings,
} from "@/lib/media-browse";
import { logoutSignal } from "@/lib/session-events";

export function useMediaBrowse(accountId?: string) {
  const [settings, setSettings] = useState(defaultMediaBrowse);
  const [ready, setReady] = useState(!accountId);
  const restoring = useRef<MediaBrowseRecord | null>(null);
  const batches = useRef(1),
    scroll = useRef(0),
    latest = useRef(settings),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    if (accountId) {
      let saved: MediaBrowseRecord | null = null;
      try {
        saved = readMediaBrowse(
          sessionStorage.getItem(mediaBrowseKey(accountId)),
        );
      } catch {}
      if (saved) {
        restoring.current = saved;
        setSettings(saved);
        scroll.current = saved.scrollY;
      }
    }
    setReady(true);
  }, [accountId]);
  function persist() {
    if (!accountId || !ready || !active.current || restoring.current) return;
    try {
      sessionStorage.setItem(
        mediaBrowseKey(accountId),
        JSON.stringify({
          ...latest.current,
          version: 1,
          savedAt: Date.now(),
          batches: Math.min(50, batches.current),
          scrollY: scroll.current,
        }),
      );
    } catch {}
  }
  useEffect(() => {
    latest.current = settings;
    persist();
  }, [settings, ready]);
  useEffect(() => {
    if (!accountId || !ready) return;
    let timer: ReturnType<typeof setTimeout>;
    const saveScroll = () => {
      if (restoring.current) return;
      scroll.current = window.scrollY;
      clearTimeout(timer);
      timer = setTimeout(persist, 200);
    };
    const cancel = () => {
      restoring.current = null;
    };
    const logout = (id: unknown) => {
      if (id === accountId) {
        active.current = false;
        restoring.current = null;
        clearMediaBrowse(accountId);
      }
    };
    const signal = (event: Event) => logout((event as CustomEvent).detail);
    const storage = (event: StorageEvent) => {
      if (event.key === logoutSignal && event.newValue) {
        try {
          logout(JSON.parse(event.newValue).accountId);
        } catch {}
      }
    };
    window.addEventListener("scroll", saveScroll, { passive: true });
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("pagehide", persist);
    window.addEventListener(logoutSignal, signal);
    window.addEventListener("storage", storage);
    return () => {
      clearTimeout(timer);
      persist();
      window.removeEventListener("scroll", saveScroll);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener(logoutSignal, signal);
      window.removeEventListener("storage", storage);
    };
  }, [accountId, ready]);
  function update<K extends keyof MediaBrowseSettings>(
    key: K,
    value: SetStateAction<MediaBrowseSettings[K]>,
  ) {
    restoring.current = null;
    if (key === "query" || key === "filters") batches.current = 1;
    setSettings((current) => ({
      ...current,
      [key]:
        typeof value === "function"
          ? (
              value as (
                previous: MediaBrowseSettings[K],
              ) => MediaBrowseSettings[K]
            )(current[key])
          : value,
    }));
  }
  function finishRestore() {
    const saved = restoring.current;
    restoring.current = null;
    if (saved)
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved.scrollY, behavior: "instant" });
        scroll.current = window.scrollY;
        persist();
      });
  }
  return {
    ...settings,
    ready,
    restoring,
    batches,
    finishRestore,
    save: persist,
    setQuery: (value: SetStateAction<string>) => update("query", value),
    setFilters: (value: SetStateAction<MediaBrowseSettings["filters"]>) =>
      update("filters", value),
    setGrouped: (value: SetStateAction<boolean>) => update("grouped", value),
    setFiltersOpen: (value: SetStateAction<boolean>) =>
      update("filtersOpen", value),
  };
}
