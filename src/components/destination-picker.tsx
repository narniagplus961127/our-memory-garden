"use client";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { useEffect, useId, useState } from "react";
import {
  gardenIndexDestination,
  gardenIndexLabel,
  isWebUrl,
  type Destination,
} from "@/lib/destinations";
import { PageChoiceSelect } from "./page-choice-select";
import { loadChoiceData } from "@/lib/choice-request-cache";
import { categoryLabels, type Category } from "@/lib/organization";
export function DestinationPicker({
  value,
  onChange,
  optional = false,
}: {
  value?: Destination | null;
  onChange: (destination: Destination | null) => void;
  optional?: boolean;
}) {
  const id = useId();
  const [categories, setCategories] = useState<Category[]>([]),
    [categoryError, setCategoryError] = useState("");
  const kind = value?.kind ?? (optional ? "none" : "external");
  useEffect(() => {
    if (kind !== "category") return;
    let active = true;
    setCategoryError("");
    loadChoiceData<Category[]>("/api/categories")
      .then((list) => {
        if (active) setCategories(list);
      })
      .catch(() => {
        if (active)
          setCategoryError(
            "Could not load categories. Reopen these settings to retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [kind]);
  return (
    <div className="destination-picker">
      <Label htmlFor={id + "-kind"}>Destination type</Label>
      <NativeSelect
        id={id + "-kind"}
        value={kind}
        onChange={(e) => {
          onChange(
            e.target.value === "page"
              ? { kind: "page", pageId: "" }
              : e.target.value === "category"
                ? { kind: "category", categoryId: "" }
                : e.target.value === "external"
                  ? { kind: "external", url: "" }
                  : e.target.value === "system"
                    ? gardenIndexDestination
                    : null,
          );
        }}
      >
        {optional && (
          <NativeSelectOption value="none">No link</NativeSelectOption>
        )}
        <NativeSelectOption value="page">Garden page</NativeSelectOption>
        <NativeSelectOption value="category">Category</NativeSelectOption>
        <NativeSelectOptGroup label="System pages">
          <NativeSelectOption value="system">
            {gardenIndexLabel}
          </NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOption value="external">External URL</NativeSelectOption>
      </NativeSelect>
      {kind === "page" && (
        <>
          <Label htmlFor={id + "-page"}>Garden page</Label>
          <PageChoiceSelect
            id={id + "-page"}
            value={value?.kind === "page" ? value.pageId : ""}
            onChange={(pageId) => onChange({ kind: "page", pageId })}
          />
          {!value || value.kind !== "page" || !value.pageId ? (
            <p
              className={optional ? "muted" : "error"}
              role={optional ? undefined : "alert"}
            >
              {optional
                ? "Choose a page when you're ready. Until then, no link is shown."
                : "Choose a garden page."}
            </p>
          ) : null}
        </>
      )}
      {kind === "external" && (
        <>
          <Label htmlFor={id + "-url"}>External web address</Label>
          <Input
            id={id + "-url"}
            type="url"
            value={value?.kind === "external" ? value.url : ""}
            onChange={(e) =>
              onChange({ kind: "external", url: e.target.value })
            }
          />
          {optional && value?.kind === "external" && value.url === "" && (
            <p className="muted">
              Add a web address when you're ready. Until then, no link is shown.
            </p>
          )}
          {value?.kind === "external" &&
            !isWebUrl(value.url) &&
            !(optional && value.url === "") && (
              <p className="error" role="alert">
                Enter a complete http:// or https:// web address.
              </p>
            )}
        </>
      )}
      {kind === "category" && (
        <>
          <Label htmlFor={id + "-category"}>Category</Label>
          <NativeSelect
            id={id + "-category"}
            value={value?.kind === "category" ? value.categoryId : ""}
            onChange={(event) =>
              onChange({ kind: "category", categoryId: event.target.value })
            }
          >
            <NativeSelectOption value="">Choose a category</NativeSelectOption>
            {value?.kind === "category" &&
              value.categoryId &&
              !categories.some((c) => c.id === value.categoryId) && (
                <NativeSelectOption value={value.categoryId}>
                  Unavailable category
                </NativeSelectOption>
              )}
            {[...categoryLabels(categories)]
              .sort(([, a], [, b]) => a.localeCompare(b))
              .map(([id, label]) => (
                <NativeSelectOption key={id} value={id}>
                  {label}
                </NativeSelectOption>
              ))}
          </NativeSelect>
          {(!value || value.kind !== "category" || !value.categoryId) && (
            <p
              className={optional ? "muted" : "error"}
              role={optional ? undefined : "alert"}
            >
              {optional
                ? "Choose a category when you're ready. Until then, no link is shown."
                : "Choose a category."}
            </p>
          )}
          {categoryError && (
            <p className="error" role="alert">
              {categoryError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
