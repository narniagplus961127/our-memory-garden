"use client";
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
      <label htmlFor={id + "-kind"}>Destination type</label>
      <select
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
        {optional && <option value="none">No link</option>}
        <option value="page">Garden page</option>
        <option value="external">External URL</option>
      </select>
      {kind === "page" && (
        <>
          <label htmlFor={id + "-page"}>Garden page</label>
          <select
            id={id + "-page"}
            value={value?.kind === "page" ? value.pageId : ""}
            onChange={(e) => onChange({ kind: "page", pageId: e.target.value })}
          >
            <option value="">Choose a page</option>
            {value?.kind === "page" &&
              value.pageId &&
              !pages.some((p) => p.id === value.pageId) && (
                <option value={value.pageId}>Unavailable page</option>
              )}
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.visibility === "private" ? " · Private" : ""}
              </option>
            ))}
          </select>
          {!value || value.kind !== "page" || !value.pageId ? (
            <p className="error" role="alert">
              Choose a garden page.
            </p>
          ) : null}
        </>
      )}
      {kind === "external" && (
        <>
          <label htmlFor={id + "-url"}>External web address</label>
          <input
            id={id + "-url"}
            type="url"
            value={value?.kind === "external" ? value.url : ""}
            onChange={(e) =>
              onChange({ kind: "external", url: e.target.value })
            }
          />
          {value?.kind === "external" && !isWebUrl(value.url) && (
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
