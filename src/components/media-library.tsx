"use client";
import { useEffect, useRef, useState, useId } from "react";
import Link from "next/link";
import { displayPhotoUrl, MAX_PHOTO_BYTES, type Photo } from "@/lib/media";
type Upload = {
  id: string;
  file: File;
  state: "Queued" | "Uploading" | "Processing" | "Ready" | "Error";
  progress?: number;
  error?: string;
};
async function jsonRequest(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Could not complete the request. Please try again.",
    );
  return data;
}
function transfer(
  url: string,
  file: File,
  onProgress: (value?: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) =>
      onProgress(
        event.lengthComputable
          ? Math.round((event.loaded / event.total) * 100)
          : undefined,
      );
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload failed. Check your connection and retry."));
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and retry."));
    xhr.timeout = 180000;
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please retry."));
    xhr.send(file);
  });
}
export function PhotoDetails({
  photo,
  onClose,
}: {
  photo: Photo;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="photo-details"
      onCancel={onClose}
      aria-labelledby="photo-details-title"
    >
      <div className="panel-heading">
        <h2 id="photo-details-title">Photo details</h2>
        <button
          className="secondary"
          onClick={onClose}
          aria-label="Close photo details"
        >
          Close
        </button>
      </div>
      <img
        className="photo-detail-preview"
        src={displayPhotoUrl(photo.id)}
        alt={photo.name}
      />
      <h3>{photo.name}</h3>
      <p className="badge">
        {photo.publiclyAccessible ? "Publicly accessible" : "Private photo"}
      </p>
      <p>
        {photo.publiclyAccessible
          ? "Used on a public page. Anyone with the display address can view this copy. Previously downloaded copies cannot be recalled."
          : "Private — no public page uses this photo."}
      </p>
      <p className="muted">
        The original is always protected. Display copies have hidden metadata
        removed.
      </p>
      <h3>
        Used on {photo.usages.length}{" "}
        {photo.usages.length === 1 ? "page" : "pages"}
      </h3>
      {photo.usages.length ? (
        <ul className="photo-usages">
          {photo.usages.map((usage) => (
            <li key={usage.id}>
              <Link href={"/admin/pages/" + usage.id}>{usage.title}</Link>
              <span className="badge">
                {usage.deleted
                  ? "In trash"
                  : usage.visibility === "public"
                    ? "Public"
                    : "Private"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Not used on any page yet.</p>
      )}
      <p className="muted">
        <small>
          {photo.width} × {photo.height} pixels · Original{" "}
          {(photo.original_bytes / 1024 / 1024).toFixed(2)} MB · Display{" "}
          {(photo.display_bytes / 1024).toFixed(1)} KB
        </small>
      </p>
      <div className="actions">
        <a className="button" href={"/api/media/" + photo.id + "/original"}>
          Download original
        </a>
        {photo.usages.length > 0 && (
          <button disabled aria-describedby="photo-in-use">
            Delete photo
          </button>
        )}
      </div>
      {photo.usages.length > 0 && (
        <p id="photo-in-use" className="muted">
          <small>
            This photo is in use. Remove its page references before deleting it.
          </small>
        </p>
      )}
    </dialog>
  );
}
export function MediaLibrary({
  onSelect,
}: {
  onSelect?: (photoId: string) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [uploads, setUploads] = useState<Upload[]>([]),
    [detail, setDetail] = useState<Photo | null>(null);
  const fieldId = useId();
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);
  function closeDetails() {
    setDetail(null);
    requestAnimationFrame(() => detailsTrigger.current?.focus());
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/media", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setPhotos(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setPhotos(await jsonRequest("/api/media"));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
  function update(id: string, change: Partial<Upload>) {
    setUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  }
  async function upload(item: Upload) {
    try {
      update(item.id, {
        state: "Queued",
        error: undefined,
        progress: undefined,
      });
      if (item.file.size > MAX_PHOTO_BYTES)
        throw new Error("Photos must be 25 MB or smaller.");
      const started = await jsonRequest("/api/media/uploads", {
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
      });
      update(item.id, { state: "Uploading", progress: 0 });
      await transfer(started.uploadUrl, item.file, (progress) =>
        update(item.id, { progress }),
      );
      update(item.id, { state: "Processing", progress: undefined });
      const photo: Photo = await jsonRequest(
        "/api/media/" + started.id + "/complete",
        {},
      );
      setPhotos((current) => [
        photo,
        ...current.filter((p) => p.id !== photo.id),
      ]);
      update(item.id, { state: "Ready" });
    } catch (error) {
      update(item.id, {
        state: "Error",
        error: (error as Error).message,
        progress: undefined,
      });
    }
  }
  async function details(id: string, trigger: HTMLButtonElement) {
    detailsTrigger.current = trigger;
    setError("");
    try {
      setDetail(await jsonRequest("/api/media/" + id));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const filtered = photos.filter((photo) =>
    photo.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className={onSelect ? "media-library media-picker" : "media-library"}>
      <div className="media-upload">
        <label htmlFor={fieldId + "-upload"}>Upload photos</label>
        <input
          id={fieldId + "-upload"}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            const items = Array.from(event.target.files ?? []).map((file) => ({
              id: crypto.randomUUID(),
              file,
              state: "Queued" as const,
            }));
            setUploads((current) => [...current, ...items]);
            event.target.value = "";
            void (async () => {
              for (const item of items) await upload(item);
            })();
          }}
        />
        <p className="muted">
          <small>
            JPEG, PNG or WebP · up to 25 MB and 40 megapixels each. Protected
            originals and optimized display copies.
          </small>
        </p>
      </div>
      {uploads.length > 0 && (
        <ul className="upload-progress" aria-label="Upload progress">
          {uploads.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.file.name}</strong>
                <span role="status">{item.state}</span>
              </div>
              {item.state === "Uploading" && (
                <progress
                  value={item.progress}
                  max={100}
                  aria-label={"Uploading " + item.file.name}
                />
              )}{" "}
              {item.error && (
                <p role="alert" className="error">
                  {item.error}
                </p>
              )}
              {item.state === "Error" && (
                <div className="actions">
                  <button
                    className="secondary"
                    aria-label={"Retry " + item.file.name}
                    onClick={() => void upload(item)}
                  >
                    Retry
                  </button>
                  <button
                    className="secondary"
                    aria-label={"Remove failed " + item.file.name}
                    onClick={() =>
                      setUploads((current) =>
                        current.filter((u) => u.id !== item.id),
                      )
                    }
                  >
                    Remove failed
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="media-search">
        <div>
          <label htmlFor={fieldId + "-search"}>Find a photo</label>
          <input
            id={fieldId + "-search"}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className="secondary"
          disabled={loading}
          onClick={() => void refresh()}
        >
          Refresh library
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button className="secondary" onClick={() => void refresh()}>
            Retry library
          </button>
        </p>
      )}
      {loading && <p role="status">Loading photos…</p>}
      {!loading && !filtered.length && (
        <div className="empty-state">
          <h3>
            {photos.length ? "No matching photos" : "Let a memory take root"}
          </h3>
          <p className="muted">
            {photos.length
              ? "Try another photo name."
              : "Upload your first photo to share it across your pages."}
          </p>
        </div>
      )}
      <div className="media-grid">
        {filtered.map((photo) => (
          <article className="media-card" key={photo.id}>
            <img
              src={displayPhotoUrl(photo.id)}
              alt={photo.name}
              loading="lazy"
            />
            <div>
              <strong>{photo.name}</strong>
              <small>
                {photo.publiclyAccessible
                  ? "Publicly accessible"
                  : "Private photo"}{" "}
                · {photo.usages.length}{" "}
                {photo.usages.length === 1 ? "page" : "pages"}
              </small>
              <div className="actions">
                {onSelect ? (
                  <button
                    className="secondary"
                    aria-label={"Use photo " + photo.name}
                    onClick={() => onSelect(photo.id)}
                  >
                    Use photo
                  </button>
                ) : null}
                <button
                  className="secondary"
                  aria-label={"Photo details " + photo.name}
                  onClick={(event) =>
                    void details(photo.id, event.currentTarget)
                  }
                >
                  Details
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {detail && <PhotoDetails photo={detail} onClose={closeDetails} />}
    </div>
  );
}
export function PhotoPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="photo-picker">
      <span className="field-label">Photo</span>
      {value && <img src={displayPhotoUrl(value)} alt="Selected photo" />}
      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close photo library" : "Choose photo"}
        </button>
        {value && (
          <button
            type="button"
            className="secondary"
            onClick={() => onChange("")}
          >
            Remove photo
          </button>
        )}
      </div>
      {open && (
        <MediaLibrary
          onSelect={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
