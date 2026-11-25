"use client";

import { useEffect, useRef, type FormEvent } from "react";
import Form from "next/form";
import Link from "next/link";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Button, buttonVariants } from "./ui/button";
import { categoryLabels, type Category } from "@/lib/organization";
import { readGardenQuery } from "@/lib/garden-browse";

function filterKey(query: ReturnType<typeof readGardenQuery>) {
  return JSON.stringify([query.search, query.year, query.categoryId]);
}
function readForm(form: HTMLFormElement) {
  const values = new FormData(form);
  return readGardenQuery({
    q: String(values.get("q") ?? ""),
    year: String(values.get("year") ?? ""),
    category: String(values.get("category") ?? ""),
  });
}
function restoreForm(
  form: HTMLFormElement | null,
  query: ReturnType<typeof readGardenQuery>,
) {
  if (!form) return;
  for (const [name, value] of [
    ["q", query.search],
    ["year", query.year],
    ["category", query.categoryId],
  ]) {
    const control = form.elements.namedItem(name);
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement
    )
      control.value = value;
  }
}
export function GardenFilters({
  query,
  years,
  categories,
}: {
  query: ReturnType<typeof readGardenQuery>;
  years: string[];
  categories: Category[];
}) {
  const labels = categoryLabels(categories);
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const composing = useRef(false);
  const submitted = useRef(new Set<string>());
  const observedQuery = useRef<string | null>(null);
  function cancelSearch() {
    clearTimeout(timer.current);
  }
  function scheduleSearch() {
    cancelSearch();
    if (!composing.current)
      timer.current = setTimeout(() => form.current?.requestSubmit(), 400);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    cancelSearch();
    if (composing.current) {
      event.preventDefault();
      return;
    }
    const next = readForm(event.currentTarget);
    const key = filterKey(next);
    if (query.page === 1 && key === filterKey(query)) {
      event.preventDefault();
      return;
    }
    if (submitted.current.size >= 50) submitted.current.clear();
    submitted.current.add(key);
  }
  useEffect(() => {
    const key = JSON.stringify([query.page, filterKey(query)]);
    if (observedQuery.current === key) return;
    const initial = observedQuery.current === null;
    observedQuery.current = key;
    if (initial) {
      // Preserve and apply entries made before hydration attached the handlers.
      if (
        form.current &&
        filterKey(readForm(form.current)) !== filterKey(query)
      )
        form.current.requestSubmit();
      return;
    }
    // Our responses must not overwrite text typed while a request was in flight.
    if (query.page === 1 && submitted.current.delete(filterKey(query))) return;
    clearTimeout(timer.current);
    restoreForm(form.current, query);
  }, [query.page, query.search, query.year, query.categoryId]);
  useEffect(() => {
    const restoreHistory = () => {
      clearTimeout(timer.current);
      submitted.current.clear();
      if (window.location.pathname === "/garden")
        restoreForm(
          form.current,
          readGardenQuery(
            Object.fromEntries(new URLSearchParams(window.location.search)),
          ),
        );
    };
    window.addEventListener("popstate", restoreHistory);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("popstate", restoreHistory);
    };
  }, []);
  return (
    <Form
      ref={form}
      action="/garden"
      prefetch={false}
      aria-label="Garden filters"
      className="garden-filters mt-6"
      onSubmit={submit}
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) {
          cancelSearch();
          form.current?.requestSubmit();
        } else if (event.target instanceof HTMLInputElement) scheduleSearch();
      }}
      onCompositionStart={() => {
        composing.current = true;
        cancelSearch();
      }}
      onCompositionEnd={() => {
        composing.current = false;
        scheduleSearch();
      }}
    >
      <div className="garden-filter-field">
        <Label htmlFor="garden-search" className="sr-only">
          Find a memory
        </Label>
        <Input
          id="garden-search"
          name="q"
          type="search"
          placeholder="Search by name…"
          maxLength={200}
          defaultValue={query.search}
        />
      </div>
      <div className="garden-filter-field">
        <Label htmlFor="garden-year" className="sr-only">
          Year
        </Label>
        <NativeSelect id="garden-year" name="year" defaultValue={query.year}>
          <NativeSelectOption value="">All years</NativeSelectOption>
          {query.year && !years.includes(query.year) && (
            <NativeSelectOption value={query.year}>
              {query.year}
            </NativeSelectOption>
          )}
          {years.map((year) => (
            <NativeSelectOption key={year} value={year}>
              {year}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="garden-filter-field">
        <Label htmlFor="garden-category" className="sr-only">
          Category
        </Label>
        <NativeSelect
          id="garden-category"
          name="category"
          defaultValue={query.categoryId}
        >
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {query.categoryId && !labels.has(query.categoryId) && (
            <NativeSelectOption value={query.categoryId}>
              Unavailable category
            </NativeSelectOption>
          )}
          {[...labels]
            .sort((a, b) => a[1].localeCompare(b[1], "en"))
            .map(([id, label]) => (
              <NativeSelectOption key={id} value={id}>
                {label}
              </NativeSelectOption>
            ))}
        </NativeSelect>
      </div>
      <div className="garden-filter-actions">
        <noscript>
          <Button type="submit">Apply filters</Button>
        </noscript>
        {(query.search || query.year || query.categoryId) && (
          <Link
            prefetch={false}
            href="/garden"
            onClick={() => {
              cancelSearch();
              submitted.current.clear();
            }}
            className={buttonVariants({ variant: "outline" })}
          >
            Clear filters
          </Link>
        )}
      </div>
    </Form>
  );
}
