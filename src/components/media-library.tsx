"use client";
import { Modal } from "./modal";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal } from "lucide-react";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useId,
  type ComponentProps,
} from "react";
import { MediaFilterControls } from "./media-filters";
import {
  emptyMediaFilters,
  mediaFilterParams,
  validMediaFilters,
  type MediaFilters,
} from "@/lib/media-filters";
import { Tabs } from "radix-ui";
import Link from "next/link";
import {
  responsivePhotoSources,
  thumbnailPhotoUrl,
  MAX_PHOTO_BYTES,
  type Photo,
  type PhotoLibraryPage,
  type PhotoListItem,
} from "@/lib/media";
import { photoGridBatchSize, type GridPickerPhoto } from "@/lib/photo-grid";
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
  photo: initialPhoto,
  onClose,
  onDeleted,
}: {
  photo: Photo;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [photo, setPhoto] = useState(initialPhoto),
    [confirm, setConfirm] = useState(false),
    [deleting, setDeleting] = useState(false),
    [deleteError, setDeleteError] = useState(initialPhoto.deletionError || "");
  async function remove() {
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/media/" + photo.id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onDeleted();
    } catch (error) {
      setDeleteError(
        error instanceof TypeError
          ? "Could not delete the photo. Check your connection and retry."
          : error instanceof Error
            ? error.message
            : "Could not delete the photo. Please retry.",
      );
      try {
        const response = await fetch("/api/media/" + photo.id, {
          cache: "no-store",
        });
        if (response.status === 404) {
          onDeleted();
          return;
        }
        if (response.ok) setPhoto(await response.json());
      } catch {}
    } finally {
      setDeleting(false);
    }
  }
  return (
    <Modal
      title="Photo details"
      label="Photo details"
      onClose={onClose}
      busy={deleting}
      className="photo-details"
    >
      <div className="photo-detail-identity">
        <h3>{photo.name}</h3>
        <span className="badge">
          {photo.publiclyAccessible ? "Publicly accessible" : "Private photo"}
        </span>
      </div>
      <Tabs.Root defaultValue="overview">
        <Tabs.List
          className="photo-detail-tabs"
          aria-label="Photo details sections"
        >
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="usage" disabled={deleting}>
            Usage
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview">
          <div className="photo-overview">
            {!photo.deletionPending && (
              <img
                className="photo-detail-preview"
                src={thumbnailPhotoUrl(photo.id, 640)}
                alt={photo.name}
              />
            )}
            <div className="photo-overview-info">
              {photo.deletionPending && (
                <p className="muted">
                  Deletion is incomplete. Retry to remove the remaining stored
                  copies.
                </p>
              )}
              <p>
                {photo.publiclyAccessible
                  ? "Used on a public page. Anyone with the display address can view this copy. Previously downloaded copies cannot be recalled."
                  : "Private — no public page uses this photo."}
              </p>
              <p className="muted">
                The original is always protected. Display copies have hidden
                metadata removed.
              </p>
              <p className="muted">
                <small>
                  {photo.width} × {photo.height} pixels · Original{" "}
                  {(photo.original_bytes / 1024 / 1024).toFixed(2)} MB · Display{" "}
                  {(photo.display_bytes / 1024).toFixed(1)} KB
                </small>
              </p>
              <div className="actions">
                {!photo.deletionPending && (
                  <Button asChild className="button">
                    <a href={"/api/media/" + photo.id + "/original"}>
                      Download original
                    </a>
                  </Button>
                )}
                <Button
                  className="secondary"
                  disabled={photo.usages.length > 0}
                  aria-describedby={
                    photo.usages.length > 0 ? "photo-in-use" : undefined
                  }
                  onClick={() => setConfirm(true)}
                >
                  {photo.deletionPending ? "Retry deletion" : "Delete photo"}
                </Button>
              </div>
              {photo.usages.length > 0 && (
                <p id="photo-in-use" className="muted">
                  <small>
                    This photo is in use. Remove it from current pages and cover
                    settings before deleting it. Save those changes, then reopen
                    photo details.
                  </small>
                </p>
              )}
            </div>
          </div>
        </Tabs.Content>
        <Tabs.Content value="usage">
          <h3>
            Used on {photo.usages.length}{" "}
            {photo.usages.length === 1 ? "page" : "pages"}
          </h3>
          {photo.usages.length ? (
            <ul className="photo-usages">
              {photo.usages.map((usage) => (
                <li key={usage.id + (usage.history ? "-history" : "-current")}>
                  <Link href={"/admin/pages/" + usage.id}>{usage.title}</Link>
                  <span className="badge">
                    {usage.history
                      ? "Retained history"
                      : usage.deleted
                        ? "In trash"
                        : usage.visibility === "public"
                          ? "Public"
                          : "Private"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Not used on any current page.</p>
          )}
        </Tabs.Content>
      </Tabs.Root>
      {confirm && (
        <ConfirmationDialog
          title="Delete this photo permanently?"
          description={
            photo.deletionPending
              ? "Deletion is incomplete. Retry to remove the remaining stored copies."
              : "This removes its original and display copies from the shared library, including access from saved page versions. This cannot be undone."
          }
          busy={deleting}
          confirmDisabled={photo.usages.length > 0}
          error={deleteError}
          confirmLabel={
            photo.deletionPending ? "Retry deletion" : "Delete permanently"
          }
          retryLabel="Retry deletion"
          onConfirm={() => void remove()}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Modal>
  );
}
export function MediaLibrary({
  onSelect,
  multiple,
}: {
  onSelect?: (photoId: string) => void;
  multiple?: {
    selected: Set<string>;
    toggle: (id: string) => void;
    add: (ids: string[]) => void;
  };
}) {
  const [photos, setPhotos] = useState<PhotoListItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [uploads, setUploads] = useState<Upload[]>([]),
    [detail, setDetail] = useState<Photo | null>(null);
  const fieldId = useId();
  const [filters, setFilters] = useState<MediaFilters>(emptyMediaFilters);
  const [grouped, setGrouped] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = Object.entries(filters).filter(
    ([key, value]) => value !== emptyMediaFilters[key as keyof MediaFilters],
  ).length;
  function changeFilters(next: MediaFilters) {
    setFilters(next);
    setLibraryRequest({ after: null });
    setLibraryNext(null);
    setPhotos([]);
    setPickerPage(0);
    setPickerPhotos([]);
    setPickerMore(false);
    rangeAnchor.current = null;
  }
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);
  const choosingMany = Boolean(multiple);
  const rangeAnchor = useRef<string | null>(null);
  const [libraryRequest, setLibraryRequest] = useState<{
    after: string | null;
  }>({ after: null });
  const [libraryNext, setLibraryNext] = useState<string | null>(null);
  const [pickerPhotos, setPickerPhotos] = useState<GridPickerPhoto[]>([]);
  const [pickerMore, setPickerMore] = useState(false);
  const [pickerPage, setPickerPage] = useState(0);
  const [pickerRefresh, setPickerRefresh] = useState(0);
  function choosePhoto(id: string, extend: boolean) {
    if (!multiple) return;
    const anchor = pickerPhotos.findIndex(
      (photo) => photo.photoId === rangeAnchor.current,
    );
    if (extend && anchor >= 0) {
      const end = pickerPhotos.findIndex((photo) => photo.photoId === id);
      multiple.add(
        pickerPhotos
          .slice(Math.min(anchor, end), Math.max(anchor, end) + 1)
          .map((photo) => photo.photoId),
      );
      return;
    }
    rangeAnchor.current = id;
    multiple.toggle(id);
  }
  function closeDetails() {
    setDetail(null);
    requestAnimationFrame(() => detailsTrigger.current?.focus());
  }
  useEffect(() => {
    if (choosingMany) return;
    if (!validMediaFilters(filters)) {
      setError("Choose a valid upload date range.");
      setLoading(false);
      return;
    }
    const { after } = libraryRequest;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      view: "library",
      ...mediaFilterParams(filters),
    });
    if (query.trim()) params.set("search", query.trim());
    if (after) params.set("after", after);
    const timer = setTimeout(
      () => {
        fetch("/api/media?" + params, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            if (controller.signal.aborted) return;
            const { photos: received, nextCursor }: PhotoLibraryPage = data;
            setPhotos((current) => {
              if (!after) return received;
              const loaded = new Set(current.map((photo) => photo.id));
              return [
                ...current,
                ...received.filter((photo) => !loaded.has(photo.id)),
              ];
            });
            setLibraryNext(nextCursor);
          })
          .catch((cause: Error) => {
            if (!controller.signal.aborted) setError(cause.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      query && !after ? 150 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [choosingMany, libraryRequest, query, filters]);
  useEffect(() => {
    if (!choosingMany) return;
    if (!validMediaFilters(filters)) {
      setError("Choose a valid upload date range.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const offset = pickerPage * photoGridBatchSize;
    const params = new URLSearchParams({
      view: "grid-picker",
      search: query,
      offset: String(offset),
      ...mediaFilterParams(filters),
    });
    const timer = setTimeout(
      () => {
        fetch("/api/media?" + params, { signal: controller.signal })
          .then(async (response) => {
            const data: {
              photos: GridPickerPhoto[];
              more: boolean;
              error?: string;
            } = await response.json();
            if (!response.ok) throw Error(data.error);
            if (controller.signal.aborted) return;
            setPickerPhotos((current) => {
              const existing = current.slice(0, offset);
              const ids = new Set(existing.map((photo) => photo.photoId));
              return [
                ...existing,
                ...data.photos.filter((photo) => !ids.has(photo.photoId)),
              ];
            });
            setPickerMore(data.more);
          })
          .catch((cause: Error) => {
            if (!controller.signal.aborted) setError(cause.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      pickerPage ? 0 : 150,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [choosingMany, pickerPage, pickerRefresh, query, filters]);
  function refresh() {
    setLoading(true);
    if (choosingMany) {
      rangeAnchor.current = null;
      setPickerPage(0);
      setPickerRefresh((current) => current + 1);
      return;
    }
    setLibraryRequest({ after: null });
  }
  function retryLibrary() {
    if (choosingMany) refresh();
    else {
      setLoading(true);
      setLibraryRequest((current) => ({ after: current.after }));
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
      await jsonRequest("/api/media/" + started.id + "/complete", {});
      if (choosingMany) {
        setPickerPage(0);
        setPickerRefresh((current) => current + 1);
      }
      update(item.id, { state: "Ready" });
      return true;
    } catch (error) {
      update(item.id, {
        state: "Error",
        error: (error as Error).message,
        progress: undefined,
      });
      return false;
    }
  }
  async function uploadPhotos(items: Upload[]) {
    let completed = false;
    for (const item of items) {
      if (await upload(item)) completed = true;
    }
    if (completed && !choosingMany) refresh();
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
  const hasResults = multiple ? pickerPhotos.length > 0 : photos.length > 0;
  const hasMore = multiple ? pickerMore : Boolean(libraryNext);
  return (
    <div
      className={
        onSelect || multiple ? "media-library media-picker" : "media-library"
      }
    >
      <div className="media-upload">
        <Label htmlFor={fieldId + "-upload"}>Upload photos</Label>
        <Input
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
            void uploadPhotos(items);
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
                  <Button
                    className="secondary"
                    aria-label={"Retry " + item.file.name}
                    onClick={() => void uploadPhotos([item])}
                  >
                    Retry
                  </Button>
                  <Button
                    className="secondary"
                    aria-label={"Remove failed " + item.file.name}
                    onClick={() =>
                      setUploads((current) =>
                        current.filter((u) => u.id !== item.id),
                      )
                    }
                  >
                    Remove failed
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="media-search">
        <div>
          <Label htmlFor={fieldId + "-search"}>Find a photo</Label>
          <Input
            id={fieldId + "-search"}
            type="search"
            value={query}
            maxLength={200}
            onChange={(e) => {
              setQuery(e.target.value);
              setLoading(true);
              if (multiple) {
                rangeAnchor.current = null;
                setPickerPage(0);
                setPickerPhotos([]);
                setPickerMore(false);
              } else {
                setLibraryRequest({ after: null });
                setLibraryNext(null);
                setPhotos([]);
              }
            }}
          />
        </div>
        <Button className="secondary" disabled={loading} onClick={refresh}>
          Refresh library
        </Button>
      </div>
      <Button
        variant="outline"
        className="mb-4"
        aria-expanded={filtersOpen}
        aria-controls={fieldId + "-filters"}
        onClick={() => setFiltersOpen((open) => !open)}
      >
        <SlidersHorizontal />
        Filters{filterCount ? ` (${filterCount})` : ""}
      </Button>
      <div id={fieldId + "-filters"} hidden={!filtersOpen}>
        <MediaFilterControls
          value={filters}
          onChange={changeFilters}
          grouped={grouped}
          onGroupChange={multiple ? undefined : setGrouped}
        />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <Button
            className="secondary"
            disabled={loading}
            onClick={retryLibrary}
          >
            Retry library
          </Button>
        </p>
      )}
      {loading && <p role="status">Loading photos…</p>}
      {!loading && !error && !hasResults && !hasMore && (
        <div className="empty-state">
          <h3>
            {query.trim() || filterCount
              ? "No matching photos"
              : "Let a memory take root"}
          </h3>
          <p className="muted">
            {filterCount
              ? "Adjust or clear your filters to see more photos."
              : query.trim()
                ? multiple
                  ? "Try another photo name."
                  : "Try another photo name or page title."
                : "Upload your first photo to share it across your pages."}
          </p>
        </div>
      )}
      {multiple && pickerPhotos.length > 0 && (
        <p className="muted mb-3 text-sm">
          Shift-click for a range. Ctrl/⌘-click toggles a photo. Ctrl/⌘+A
          selects loaded photos.
        </p>
      )}
      <div
        className="media-grid"
        onKeyDown={
          multiple
            ? (event) => {
                if (
                  (event.ctrlKey || event.metaKey) &&
                  event.key.toLowerCase() === "a"
                ) {
                  event.preventDefault();
                  multiple.add(pickerPhotos.map((photo) => photo.photoId));
                }
              }
            : undefined
        }
      >
        {multiple
          ? pickerPhotos.map((photo) => (
              <Button
                key={photo.photoId}
                variant="outline"
                className="photo-grid-choice"
                aria-pressed={multiple.selected.has(photo.photoId)}
                onClick={(event) => choosePhoto(photo.photoId, event.shiftKey)}
              >
                <img
                  src={thumbnailPhotoUrl(photo.photoId)}
                  alt=""
                  loading="lazy"
                />
                <span>{photo.name}</span>
                {multiple.selected.has(photo.photoId) && (
                  <span className="photo-grid-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </Button>
            ))
          : photos.map((photo, index) => (
              <Fragment key={photo.id}>
                {grouped &&
                  photo.uploadedAt &&
                  photo.uploadedAt.slice(0, 7) !==
                    photos[index - 1]?.uploadedAt?.slice(0, 7) && (
                    <h3 className="col-span-full mt-2 text-xl">
                      {new Date(photo.uploadedAt).toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </h3>
                  )}
                <article className="media-card" key={photo.id}>
                  {photo.deletionPending ? (
                    <div className="media-cleanup-preview">
                      Deletion unfinished
                    </div>
                  ) : (
                    <img
                      {...responsivePhotoSources(
                        photo.id,
                        "(max-width: 600px) 50vw, 260px",
                        photo.width,
                        640,
                      )}
                      alt={photo.name}
                      loading="lazy"
                    />
                  )}
                  <div>
                    <strong>{photo.name}</strong>
                    <small>
                      {photo.deletionPending
                        ? "Deletion unfinished · retry in Details"
                        : photo.publiclyAccessible
                          ? "Publicly accessible"
                          : "Private photo"}{" "}
                      · {photo.usageCount}{" "}
                      {photo.usageCount === 1 ? "page" : "pages"}
                    </small>
                    <div className="actions">
                      {onSelect && !photo.deletionPending ? (
                        <Button
                          className="secondary"
                          aria-label={"Use photo " + photo.name}
                          onClick={() => onSelect(photo.id)}
                        >
                          Use photo
                        </Button>
                      ) : null}
                      <Button
                        className="secondary"
                        aria-label={"Photo details " + photo.name}
                        onClick={(event) =>
                          void details(photo.id, event.currentTarget)
                        }
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </article>
              </Fragment>
            ))}
      </div>
      {hasMore && (
        <div className="photo-pagination">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              if (multiple) setPickerPage((current) => current + 1);
              else setLibraryRequest({ after: libraryNext });
            }}
          >
            Show more library photos
          </Button>
        </div>
      )}
      {detail && (
        <PhotoDetails
          photo={detail}
          onClose={closeDetails}
          onDeleted={() => {
            setPhotos((current) => current.filter((p) => p.id !== detail.id));
            if (loading) refresh();
            closeDetails();
          }}
        />
      )}
    </div>
  );
}
export function PhotoLibraryDialog({
  title = "Choose a photo",
  onClose,
  returnFocus,
  busy,
  footer,
  children,
  ...picker
}: Pick<
  ComponentProps<typeof Modal>,
  "onClose" | "returnFocus" | "busy" | "footer" | "children"
> & {
  title?: string;
} & ComponentProps<typeof MediaLibrary>) {
  return (
    <Modal
      title={title}
      closeLabel="Close photo library"
      onClose={onClose}
      returnFocus={returnFocus}
      busy={busy}
      footer={footer}
      className={
        picker.multiple
          ? "canvas-photo-dialog modal-wide photo-grid-picker"
          : "canvas-photo-dialog modal-wide"
      }
    >
      {children}
      <MediaLibrary {...picker} />
    </Modal>
  );
}

export function PhotoPicker({
  value,
  onChange,
  label = "Photo",
  hideLabel = false,
}: {
  value?: string;
  label?: string;
  hideLabel?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <div className="photo-picker">
      {!hideLabel && <span className="field-label">{label}</span>}
      {value && (
        <img
          src={thumbnailPhotoUrl(value)}
          alt={"Selected " + label.toLowerCase()}
        />
      )}
      <div className="actions">
        <Button
          ref={opener}
          type="button"
          className="secondary"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {"Choose " + label.toLowerCase()}
        </Button>
        {value && (
          <Button
            type="button"
            className="secondary"
            onClick={() => onChange("")}
          >
            {"Remove " + label.toLowerCase()}
          </Button>
        )}
      </div>
      {open && (
        <PhotoLibraryDialog
          onClose={() => setOpen(false)}
          returnFocus={opener}
          onSelect={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
