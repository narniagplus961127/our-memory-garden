import Form from "next/form";
import Link from "next/link";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Button, buttonVariants } from "./ui/button";
import { categoryLabels, type Category } from "@/lib/organization";
import type { readGardenQuery } from "@/lib/garden-browse";
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
  return (
    <Form
      key={JSON.stringify(query)}
      action="/garden"
      prefetch={false}
      aria-label="Garden filters"
      className="garden-filters mt-6"
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
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, label]) => (
              <NativeSelectOption key={id} value={id}>
                {label}
              </NativeSelectOption>
            ))}
        </NativeSelect>
      </div>
      <div className="garden-filter-actions">
        <Button type="submit">Apply filters</Button>
        {(query.search || query.year || query.categoryId) && (
          <Link
            prefetch={false}
            href="/garden"
            className={buttonVariants({ variant: "outline" })}
          >
            Clear filters
          </Link>
        )}
      </div>
    </Form>
  );
}
