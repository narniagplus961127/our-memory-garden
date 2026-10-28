"use client";
import { useState } from "react";
import Link from "next/link";
import type { GardenPage } from "@/lib/pages";

export function HomepageSettings({
  homepage,
  pages,
}: {
  homepage: GardenPage;
  pages: GardenPage[];
}) {
  const [current, setCurrent] = useState(homepage);
  const [selected, setSelected] = useState(homepage.id);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function choose(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("Changing homepage…");
    try {
      const response = await fetch("/api/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not change the homepage.");
      setCurrent(data);
      setStatus("Homepage updated");
    } catch (cause) {
      setStatus("");
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not change the homepage.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="eyebrow">Current homepage</p>
      <div className="settings-card">
        <h2>{current.title}</h2>
        <p className="muted">Public · Always accessible to visitors</p>
        <Link href={"/admin/pages/" + current.id}>Edit homepage</Link>
      </div>
      <form onSubmit={choose}>
        <div className="field">
          <label htmlFor="homepage-choice">Public page</label>
          <select
            id="homepage-choice"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
        </div>
        <button
          className="primary"
          type="submit"
          disabled={busy || selected === current.id}
        >
          Choose as homepage
        </button>
      </form>
      <p className="muted settings-note">
        Your homepage stays public and cannot be deleted until another is
        selected.
      </p>
      <p role="status">{status}</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
