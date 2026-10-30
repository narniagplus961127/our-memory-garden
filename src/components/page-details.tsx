"use client";
import { useEffect, useState } from "react";
import type { GardenPage } from "@/lib/pages";
import type { Category } from "@/lib/organization";
import { displayPhotoUrl } from "@/lib/media";
import { PhotoPicker } from "./media-library";
import { detailsOf, usePageDetails } from "./use-page-details";
export function PageDetails({
  page,
  accountId,
  onSaved,
}: {
  page: GardenPage;
  accountId: string;
  onSaved: (page: GardenPage) => void;
}) {
  const save = usePageDetails(page, accountId, onSaved),
    { details, status, change } = save;
  const [error, setError] = useState(""),
    [list, setList] = useState<Category[]>([]),
    [name, setName] = useState(""),
    [categoryBusy, setCategoryBusy] = useState(false),
    [showComparison, setShowComparison] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then(async (r) => {
        if (!r.ok) throw Error("Could not load categories. Reload to retry.");
        const categories = await r.json();
        if (!cancelled) setList(categories);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    setName(list.find((c) => c.id === details.categoryId)?.name ?? "");
  }, [list, details.categoryId]);
  useEffect(() => {
    if (save.comparison) setShowComparison(true);
  }, [save.comparison?.metadata_version]);
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
      {save.comparison &&
        (showComparison ? (
          <div
            className="details-conflict"
            role="region"
            aria-label="Page details conflict"
          >
            <h3>Page details changed elsewhere</h3>
            <p>
              Compare your details with the saved details before choosing which
              to keep.
            </p>
            {[
              { label: "My details", value: details },
              { label: "Saved details", value: detailsOf(save.comparison) },
            ].map(({ label, value }) => (
              <div key={label}>
                <h4>{label}</h4>
                <p>
                  Date: {value.date ?? "No date"}
                  <br />
                  Category:{" "}
                  {list.find((c) => c.id === value.categoryId)?.name ??
                    "No category"}
                </p>
                {value.coverPhotoId ? (
                  <img
                    className="details-cover"
                    src={displayPhotoUrl(value.coverPhotoId)}
                    alt={label + " cover"}
                  />
                ) : (
                  <p>No cover photo</p>
                )}
              </div>
            ))}
            <div className="actions">
              <button className="secondary" onClick={() => save.resolve(true)}>
                Keep my details
              </button>
              <button className="secondary" onClick={() => save.resolve(false)}>
                Use saved details
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setShowComparison(false);
                  document.getElementById("page-date")?.focus();
                }}
              >
                Continue editing details
              </button>
            </div>
          </div>
        ) : (
          <button className="secondary" onClick={() => setShowComparison(true)}>
            Review details conflict
          </button>
        ))}
      <span role="status" aria-label="Page details status">
        {status}
      </span>
      {save.recovered && (
        <p className="muted">
          Recovered page details are unsaved. Retry to save them.
        </p>
      )}
      {save.warning && <p role="status">{save.warning}</p>}
      {(error || save.error || save.recovered) && (
        <>
          {(error || save.error) && (
            <p role="alert" className="error">
              {error || save.error}
            </p>
          )}
          <button className="secondary" onClick={save.retry}>
            Retry details
          </button>
        </>
      )}
    </div>
  );
}
