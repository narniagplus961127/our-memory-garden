"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Button } from "./ui/button";
import { clearChoiceRequest, loadChoiceData } from "@/lib/choice-request-cache";
import type { PageChoice, PageChoices } from "@/lib/page-choices";

export function usePageChoiceLabels(ids: string[]) {
  const key = [...new Set(ids.filter(Boolean))].sort().join(",");
  const [pages, setPages] = useState<PageChoice[]>([]);
  const [loading, setLoading] = useState(Boolean(key));
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const path = "/api/page-choices?ids=" + encodeURIComponent(key);
  useEffect(() => {
    let active = true;
    setError("");
    setLoading(Boolean(key));
    if (key)
      loadChoiceData<PageChoices>(path)
        .then((result) => {
          if (active) setPages(result.pages);
        })
        .catch(() => {
          if (active) setError("Could not load selected page names.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [key, path, revision]);
  return {
    pages: pages.filter((page) => ids.includes(page.id)),
    loading,
    error,
    retry: () => {
      clearChoiceRequest(path);
      setRevision((r) => r + 1);
    },
  };
}

export function PageChoiceSelect({
  id,
  value,
  onChange,
  excludeIds = [],
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  excludeIds?: string[];
}) {
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<PageChoice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const selected = usePageChoiceLabels(value ? [value] : []);
  const path = "/api/page-choices?" + new URLSearchParams({ search });
  useEffect(() => {
    const token = ++generation.current;
    setPages([]);
    setCursor(null);
    setError("");
    setLoading(true);
    const timer = setTimeout(
      () => {
        loadChoiceData<PageChoices>(path)
          .then((result) => {
            if (token !== generation.current) return;
            setPages(result.pages);
            setCursor(result.nextCursor);
          })
          .catch(() => {
            if (token === generation.current)
              setError("Could not load garden pages.");
          })
          .finally(() => {
            if (token === generation.current) setLoading(false);
          });
      },
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [path, search, revision]);

  async function more() {
    if (!cursor || loading) return;
    const token = generation.current;
    const nextPath = path + "&after=" + encodeURIComponent(cursor);
    setLoading(true);
    setError("");
    try {
      const result = await loadChoiceData<PageChoices>(nextPath);
      if (token !== generation.current) return;
      setPages((current) => [
        ...new Map(
          [...current, ...result.pages].map((page) => [page.id, page]),
        ).values(),
      ]);
      setCursor(result.nextCursor);
    } catch {
      clearChoiceRequest(nextPath);
      if (token === generation.current)
        setError("Could not load more pages. Try again.");
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }
  const choices = [
    ...new Map(
      [...selected.pages, ...pages].map((page) => [page.id, page]),
    ).values(),
  ].filter((page) => page.id === value || !excludeIds.includes(page.id));
  return (
    <div className="page-choice-control">
      <Input
        type="search"
        aria-label="Search garden pages"
        placeholder="Find a page…"
        maxLength={200}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <NativeSelect
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-busy={loading}
      >
        <NativeSelectOption value="">Choose a page</NativeSelectOption>
        {value && !choices.some((page) => page.id === value) && (
          <NativeSelectOption value={value}>
            {selected.loading
              ? "Loading selected page…"
              : selected.error
                ? "Selected page"
                : "Unavailable page"}
          </NativeSelectOption>
        )}
        {choices.map((page) => (
          <NativeSelectOption key={page.id} value={page.id}>
            {page.title}
            {page.visibility === "private" ? " · Private" : ""}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {loading && (
        <p className="muted" role="status">
          Loading pages…
        </p>
      )}
      {!loading && !error && !pages.length && (
        <p className="muted" role="status">
          No matching pages.
        </p>
      )}
      {cursor && (
        <Button
          type="button"
          className="secondary"
          disabled={loading}
          onClick={() => void more()}
        >
          Show more pages
        </Button>
      )}
      {(error || selected.error) && (
        <div role="alert">
          <p className="error">{error || selected.error}</p>
          <Button
            type="button"
            className="secondary"
            onClick={() => {
              clearChoiceRequest(path);
              selected.retry();
              setRevision((r) => r + 1);
            }}
          >
            Retry page choices
          </Button>
        </div>
      )}
    </div>
  );
}
