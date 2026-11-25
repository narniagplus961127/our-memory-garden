"use client";
import { useRef, useState, type FormEvent } from "react";
import type { Photo } from "@/lib/media";
import { photoMetadata } from "@/lib/photo-metadata";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Toast } from "./toast";
export function PhotoMetadataForm({
  photo,
  onSaved,
  onBusyChange,
}: {
  photo: Photo;
  onSaved: (photo: Photo) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [name, setName] = useState(photo.name),
    [labels, setLabels] = useState((photo.labels ?? []).join(", "));
  const [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  function accept(saved: Photo) {
    setName(saved.name);
    setLabels((saved.labels ?? []).join(", "));
    setConflict(false);
    setError("");
    onSaved(saved);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const next = photoMetadata(
      name,
      labels
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    );
    if (!next) {
      setError(
        "Enter a photo name up to 200 characters and up to 20 labels of 40 characters each.",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const response = await fetch("/api/media/" + photo.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...next,
          metadataVersion: photo.metadataVersion ?? 0,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setConflict(response.status === 409);
        throw Error(result.error || "Could not save photo details.");
      }
      accept(result);
      setNotice("Photo details saved.");
    } catch (error) {
      setError(
        error instanceof TypeError
          ? "Could not connect. Your entries are kept. Try again."
          : error instanceof Error
            ? error.message
            : "Could not save photo details. Your entries are kept.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  async function reload() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    try {
      const response = await fetch("/api/media/" + photo.id, {
        cache: "no-store",
      });
      const saved = await response.json();
      if (!response.ok)
        throw Error(saved.error || "Could not load saved details.");
      accept(saved);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not reload photo details.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <form onSubmit={save} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="photo-name">Photo name</Label>
        <Input
          id="photo-name"
          value={name}
          maxLength={200}
          required
          disabled={busy || photo.deletionPending}
          onChange={(event) => {
            setName(event.target.value);
            setNotice("");
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="photo-labels">Labels</Label>
        <Input
          id="photo-labels"
          value={labels}
          maxLength={1000}
          placeholder="Penang, sunset, anniversary"
          disabled={busy || photo.deletionPending}
          aria-describedby="photo-labels-help"
          onChange={(event) => {
            setLabels(event.target.value);
            setNotice("");
          }}
        />
        <small id="photo-labels-help" className="muted">
          Separate labels with commas. Up to 20 labels, 40 characters each.
          Labels help you find this photo in the library.
        </small>
      </div>
      {error && (
        <p className="error m-0" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || photo.deletionPending}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {conflict && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void reload()}
          >
            Reload saved details
          </Button>
        )}
      </div>
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
    </form>
  );
}
