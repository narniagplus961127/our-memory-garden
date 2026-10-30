"use client";
import { useEffect, useRef, useState } from "react";
import type { GardenPage } from "@/lib/pages";
import type { Category, PageDetails as Details } from "@/lib/organization";
import { PhotoPicker } from "./media-library";
export function PageDetails({
  page,
  onSaved,
}: {
  page: GardenPage;
  onSaved: (page: GardenPage) => void;
}) {
  const initial: Details = {
    date: page.page_date?.slice(0, 10) ?? null,
    categoryId: page.category_id ?? null,
    coverPhotoId: page.cover_photo_id ?? null,
  };
  const [details, setDetails] = useState(initial),
    [saved, setSaved] = useState(JSON.stringify(initial)),
    [status, setStatus] = useState("Saved"),
    [error, setError] = useState(""),
    [list, setList] = useState<Category[]>([]),
    [name, setName] = useState(""),
    [categoryBusy, setCategoryBusy] = useState(false);
  const version = useRef(page.metadata_version ?? 0),
    busy = useRef(false),
    latest = useRef(details),
    callback = useRef(onSaved);
  latest.current = details;
  callback.current = onSaved;
  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then(async (r) => {
        if (!r.ok) throw Error("Could not load categories. Reload to retry.");
        const categories = await r.json();
        if (!cancelled) {
          setList(categories);
          setName(
            categories.find((c: Category) => c.id === page.category_id)?.name ??
              "",
          );
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [page.category_id]);
  function change(changes: Partial<Details>) {
    setDetails((d) => ({ ...d, ...changes }));
    setStatus("Autosaving…");
    setError("");
  }
  async function persist() {
    if (busy.current || JSON.stringify(latest.current) === saved) return;
    busy.current = true;
    const submitted = latest.current;
    setStatus("Autosaving…");
    try {
      const r = await fetch("/api/pages/" + page.id + "/details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...submitted,
          metadataVersion: version.current,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      version.current = result.metadata_version;
      setSaved(JSON.stringify(submitted));
      callback.current(result);
      setError("");
      setStatus(
        JSON.stringify(latest.current) === JSON.stringify(submitted)
          ? "Saved"
          : "Autosaving…",
      );
    } catch (e) {
      setStatus("Unsaved · Retry");
      setError(
        e instanceof Error
          ? e.message
          : "Could not save page details. Your changes are still here.",
      );
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    if (JSON.stringify(details) === saved) return;
    const timer = setTimeout(() => void persist(), 650);
    return () => clearTimeout(timer);
  }, [details, saved]);
  async function category(rename: boolean) {
    if (categoryBusy) return;
    setCategoryBusy(true);
    setError("");
    try {
      const selected = list.find((c) => c.id === details.categoryId);
      const r = await fetch(
        "/api/categories" + (rename && selected ? "/" + selected.id : ""),
        {
          method: rename ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, expectedName: selected?.name }),
        },
      );
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setList((current) =>
        [...current.filter((c) => c.id !== result.id), result].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setName(result.name);
      if (!rename) change({ categoryId: result.id });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not change the category. Try again.",
      );
    } finally {
      setCategoryBusy(false);
    }
  }
  return (
    <div className="page-details field">
      <label htmlFor="page-date">
        Page date <small>(optional)</small>
      </label>
      <input
        id="page-date"
        aria-label="Page date"
        type="date"
        value={details.date ?? ""}
        onChange={(e) => change({ date: e.target.value || null })}
      />
      <label htmlFor="page-category">
        Page category <small>(optional)</small>
      </label>
      <select
        id="page-category"
        aria-label="Page category"
        value={details.categoryId ?? ""}
        onChange={(e) => {
          change({ categoryId: e.target.value || null });
          setName(list.find((c) => c.id === e.target.value)?.name ?? "");
        }}
      >
        <option value="">No category</option>
        {list.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <label htmlFor="category-name">Category name</label>
      <input
        id="category-name"
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="actions">
        <button
          className="secondary"
          disabled={categoryBusy || !name.trim()}
          onClick={() => void category(false)}
        >
          Create category
        </button>
        <button
          className="secondary"
          disabled={categoryBusy || !details.categoryId || !name.trim()}
          onClick={() => void category(true)}
        >
          Rename category
        </button>
      </div>
      <span className="field-label">
        Cover photo <small>(optional)</small>
      </span>
      <PhotoPicker
        value={details.coverPhotoId ?? ""}
        onChange={(value) => change({ coverPhotoId: value || null })}
      />
      <span role="status" aria-label="Page details status">
        {status}
      </span>
      {error && (
        <>
          <p role="alert" className="error">
            {error}
          </p>
          <button className="secondary" onClick={() => void persist()}>
            Retry details
          </button>
        </>
      )}
    </div>
  );
}
