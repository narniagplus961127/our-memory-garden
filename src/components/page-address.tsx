"use client";
import { useEffect, useRef, useState } from "react";
import type { GardenPage } from "@/lib/pages";
export function PageAddress({ page }: { page: GardenPage }) {
  const [slug, setSlug] = useState(page.slug),
    [saved, setSaved] = useState(page.slug),
    [status, setStatus] = useState("Saved"),
    [error, setError] = useState("");
  const busy = useRef(false),
    latest = useRef(slug);
  latest.current = slug;
  async function persist() {
    if (busy.current || slug === saved) return;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
      setError("Use lowercase letters, numbers and single hyphens.");
      setStatus("Not saved");
      return;
    }
    busy.current = true;
    setStatus("Saving…");
    const submitted = slug;
    try {
      const r = await fetch("/api/pages/" + page.id + "/address", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: submitted, expectedSlug: saved }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setSaved(data.slug);
      setError("");
      setStatus(latest.current === data.slug ? "Saved" : "Unsaved");
    } catch (e) {
      setStatus("Not saved");
      setError(
        e instanceof Error
          ? e.message
          : "Could not change the address. Your entry is still here.",
      );
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    if (slug === saved) return;
    const timer = setTimeout(() => void persist(), 650);
    return () => clearTimeout(timer);
  }, [slug, saved]);
  return (
    <div className="page-address field">
      <label htmlFor="page-address">Page address</label>
      <input
        id="page-address"
        value={slug}
        maxLength={100}
        onChange={(e) => {
          setSlug(e.target.value);
          setStatus(e.target.value === saved ? "Saved" : "Unsaved");
          setError("");
        }}
        onBlur={() => void persist()}
        aria-invalid={Boolean(error)}
        aria-describedby="address-note"
      />
      <p id="address-note" className="muted">
        <small>
          /garden/{slug}
          <br />
          Changing this removes the old address. Previously shared address links
          stop working. Garden links keep working.
        </small>
      </p>
      <span role="status" aria-label="Address status">
        {status}
      </span>
      {error && (
        <>
          <p role="alert" className="error">
            {error}
          </p>
          <button className="secondary" onClick={() => void persist()}>
            Retry address
          </button>
        </>
      )}
    </div>
  );
}
