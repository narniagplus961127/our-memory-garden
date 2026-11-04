"use client";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { Category, GridSelection, PageCard } from "@/lib/organization";
import { displayPhotoUrl } from "@/lib/media";
export function PageGrid({
  selection,
  showDate = true,
  cards,
}: {
  selection: GridSelection;
  showDate?: boolean;
  cards?: PageCard[];
}) {
  const [loaded, setLoaded] = useState<PageCard[]>(cards ?? []),
    [error, setError] = useState("");
  const key = JSON.stringify(selection);
  useEffect(() => {
    if (cards) {
      setLoaded(cards);
      return;
    }
    let cancelled = false;
    setLoaded([]);
    setError("");
    fetch("/api/page-grid?selection=" + encodeURIComponent(key))
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        if (!cancelled) setLoaded(data);
      })
      .catch(() => {
        if (!cancelled)
          setError("Could not load pages. Reopen this page to retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [key, cards]);
  return (
    <section className="garden-block garden-page-grid" aria-label="Page grid">
      {error && <p role="alert">{error}</p>}
      {loaded.map((p) => (
        <article className="garden-page-card" key={p.id}>
          <a href={"/p/" + p.id}>
            {p.cover_photo_id ? (
              <img
                src={displayPhotoUrl(p.cover_photo_id)}
                alt=""
                loading="lazy"
              />
            ) : (
              <div className="garden-card-cover" aria-hidden="true">
                ❀
              </div>
            )}
            <h3>{p.title}</h3>
          </a>
          {showDate && p.page_date && (
            <time dateTime={p.page_date}>
              {new Date(p.page_date + "T12:00:00Z").toLocaleDateString(
                "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                },
              )}
            </time>
          )}
          {p.visibility === "private" && (
            <small className="muted">Private · only us</small>
          )}
        </article>
      ))}
    </section>
  );
}
export function PageGridSettings({
  value,
  onChange,
}: {
  value: GridSelection;
  onChange: (value: GridSelection) => void;
}) {
  const [pages, setPages] = useState<PageCard[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [pick, setPick] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/pages"), fetch("/api/categories")])
      .then(async (responses) => {
        if (responses.some((r) => !r.ok)) throw Error();
        const [pages, categories] = await Promise.all(
          responses.map((r) => r.json()),
        );
        if (!cancelled) {
          setPages(pages);
          setCategories(categories);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError("Could not load page choices. Reopen settings to retry.");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  function move(index: number, offset: number) {
    const pageIds = [...value.pageIds];
    [pageIds[index], pageIds[index + offset]] = [
      pageIds[index + offset],
      pageIds[index],
    ];
    onChange({ ...value, pageIds });
  }
  return (
    <div className="field page-grid-settings">
      <Label htmlFor="grid-mode">Grid selection</Label>
      <NativeSelect
        id="grid-mode"
        value={value.mode}
        onChange={(e) =>
          onChange({
            ...value,
            mode: e.target.value === "category" ? "category" : "manual",
          })
        }
      >
        <NativeSelectOption value="manual">
          Choose pages manually
        </NativeSelectOption>
        <NativeSelectOption value="category">
          Pages in a category
        </NativeSelectOption>
      </NativeSelect>
      {value.mode === "category" ? (
        <>
          <Label htmlFor="grid-category">Grid category</Label>
          <NativeSelect
            id="grid-category"
            value={value.categoryId}
            onChange={(e) => onChange({ ...value, categoryId: e.target.value })}
          >
            <NativeSelectOption value="">Choose a category</NativeSelectOption>
            {value.categoryId &&
              !categories.some((c) => c.id === value.categoryId) && (
                <NativeSelectOption value={value.categoryId}>
                  Unavailable category
                </NativeSelectOption>
              )}
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </>
      ) : (
        <>
          <Label htmlFor="grid-page">Add page to grid</Label>
          <NativeSelect
            id="grid-page"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            <NativeSelectOption value="">Choose a page</NativeSelectOption>
            {pages
              .filter((p) => !value.pageIds.includes(p.id))
              .map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.title}
                  {p.visibility === "private" ? " · Private" : ""}
                </NativeSelectOption>
              ))}
          </NativeSelect>
          <Button
            className="secondary"
            disabled={!pick || value.pageIds.length >= 100}
            onClick={() => {
              onChange({ ...value, pageIds: [...value.pageIds, pick] });
              setPick("");
            }}
          >
            Add selected page
          </Button>
          <ol className="grid-selected-pages">
            {value.pageIds.map((id, i) => {
              const p = pages.find((p) => p.id === id);
              return (
                <li key={id}>
                  <span>
                    {p?.title ?? "Unavailable page"}
                    {p?.visibility === "private" && <small> · Private</small>}
                  </span>
                  <div className="actions">
                    <Button
                      className="secondary"
                      aria-label={"Move page up " + (i + 1)}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      className="secondary"
                      aria-label={"Move page down " + (i + 1)}
                      disabled={i === value.pageIds.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      className="secondary"
                      aria-label={"Remove page " + (i + 1)}
                      onClick={() =>
                        onChange({
                          ...value,
                          pageIds: value.pageIds.filter((v) => v !== id),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <p className="muted">
        <small>
          Private pages appear only for administrators. Create and rename
          categories in Page details.
        </small>
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
