"use client";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { useEffect, useId, useState } from "react";
import { isWebUrl, type Destination } from "@/lib/destinations";
import type { GardenPage } from "@/lib/pages";
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
  const [pages, setPages] = useState<GardenPage[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/pages")
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((p) => {
        if (active) setPages(p);
      })
      .catch(() => {
        if (active)
          setError(
            "Could not load garden pages. Reopen these settings to retry.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const kind = value?.kind ?? (optional ? "none" : "external");
  return (
    <div className="destination-picker">
      <Label htmlFor={id + "-kind"}>Destination type</Label>
      <NativeSelect
        id={id + "-kind"}
        value={kind}
        onChange={(e) =>
          onChange(
            e.target.value === "page"
              ? { kind: "page", pageId: "" }
              : e.target.value === "external"
                ? { kind: "external", url: "" }
                : null,
          )
        }
      >
        {optional && (
          <NativeSelectOption value="none">No link</NativeSelectOption>
        )}
        <NativeSelectOption value="page">Garden page</NativeSelectOption>
        <NativeSelectOption value="external">External URL</NativeSelectOption>
      </NativeSelect>
      {kind === "page" && (
        <>
          <Label htmlFor={id + "-page"}>Garden page</Label>
          <NativeSelect
            id={id + "-page"}
            value={value?.kind === "page" ? value.pageId : ""}
            onChange={(e) => onChange({ kind: "page", pageId: e.target.value })}
          >
            <NativeSelectOption value="">Choose a page</NativeSelectOption>
            {value?.kind === "page" &&
              value.pageId &&
              !pages.some((p) => p.id === value.pageId) && (
                <NativeSelectOption value={value.pageId}>
                  Unavailable page
                </NativeSelectOption>
              )}
            {pages.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.title}
                {p.visibility === "private" ? " · Private" : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
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
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
