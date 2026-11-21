import { MAX_PHOTO_BYTES } from "./media";

export type PhotoUploadState =
  "Queued" | "Uploading" | "Processing" | "Ready" | "Error" | "Cancelled";
export type PhotoUploadItem = {
  id: string;
  name: string;
  state: PhotoUploadState;
  progress?: number;
  error?: string;
  retryable: boolean;
  photoId?: string;
};
export type PhotoUploadSnapshot = {
  items: PhotoUploadItem[];
  pending: number;
  ready: number;
  failed: number;
  queued: number;
  unfinished: boolean;
  readyRevision: number;
  settledRevision: number;
  sessionMessage: string;
};
type RemoteUpload = { id: string; uploadUrl: string };
export type PhotoUploadTransport = {
  initiate: (file: File, signal: AbortSignal) => Promise<RemoteUpload>;
  transfer: (
    url: string,
    file: File,
    signal: AbortSignal,
    progress: (percent?: number) => void,
  ) => Promise<void>;
  complete: (id: string, signal: AbortSignal) => Promise<unknown>;
};
export class PhotoUploadError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}
type RecordItem = {
  item: PhotoUploadItem;
  file?: File;
  remote?: RemoteUpload;
  transferred: boolean;
};
const emptySnapshot: PhotoUploadSnapshot = {
  items: [],
  pending: 0,
  ready: 0,
  failed: 0,
  queued: 0,
  unfinished: false,
  readyRevision: 0,
  settledRevision: 0,
  sessionMessage: "",
};
export const emptyPhotoUploads = () => emptySnapshot;

export class PhotoUploadQueue {
  private records = new Map<string, RecordItem>();
  private active = new Map<string, AbortController>();
  private listeners = new Set<() => void>();
  private owner: string | null = null;
  private snapshot = emptySnapshot;
  private readyRevision = 0;
  private settledRevision = 0;
  private cycle = false;
  private sessionMessage = "";
  constructor(private transport: PhotoUploadTransport) {}
  getSnapshot = () => this.snapshot;
  getReadyRevision = () => this.readyRevision;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  bindAccount(accountId: string) {
    if (this.owner && this.owner !== accountId) this.stop();
    this.owner = accountId;
  }
  enqueue(accountId: string, files: File[]) {
    this.bindAccount(accountId);
    if (!this.snapshot.unfinished) this.records.clear();
    this.sessionMessage = "";
    for (const file of files) {
      const error =
        !file.name.trim() || file.name.length > 200 || !file.size
          ? "Choose a photo with a valid name and size."
          : file.size > MAX_PHOTO_BYTES
            ? "Photos must be 25 MB or smaller."
            : !["image/jpeg", "image/png", "image/webp"].includes(file.type)
              ? "Choose a JPEG, PNG or WebP photo."
              : "";
      const item: PhotoUploadItem = {
        id: crypto.randomUUID(),
        name: file.name,
        state: error ? "Error" : "Queued",
        error: error || undefined,
        retryable: !error,
      };
      this.records.set(item.id, {
        item,
        file: error ? undefined : file,
        transferred: false,
      });
    }
    if (files.length) this.cycle = true;
    this.pump();
  }
  retry(id: string) {
    const record = this.records.get(id);
    if (
      !record?.file ||
      record.item.state !== "Error" ||
      !record.item.retryable
    )
      return;
    if (!record.transferred) record.remote = undefined;
    record.item = {
      ...record.item,
      state: "Queued",
      error: undefined,
      progress: undefined,
    };
    this.cycle = true;
    this.pump();
  }
  retryFailed() {
    for (const [id, record] of this.records)
      if (record.item.state === "Error") this.retry(id);
  }
  cancelQueued() {
    for (const record of this.records.values())
      if (record.item.state === "Queued") {
        record.item = { ...record.item, state: "Cancelled" };
        record.file = undefined;
      }
    this.pump();
  }
  remove(id: string) {
    const record = this.records.get(id);
    if (record && !["Uploading", "Processing"].includes(record.item.state)) {
      this.records.delete(id);
      this.pump();
    }
  }
  clearFinished() {
    for (const [id, record] of this.records)
      if (["Ready", "Cancelled"].includes(record.item.state))
        this.records.delete(id);
    this.emit();
  }
  stop(accountId?: string, message = "") {
    if (accountId && accountId !== this.owner) return;
    for (const controller of this.active.values()) controller.abort();
    for (const record of this.records.values()) record.file = undefined;
    this.active.clear();
    this.records.clear();
    this.owner = null;
    this.cycle = false;
    this.sessionMessage = message;
    this.emit();
  }
  private emit() {
    const items = [...this.records.values()].map((record) => record.item);
    const pending = items.filter((item) =>
      ["Queued", "Uploading", "Processing"].includes(item.state),
    ).length;
    this.snapshot = {
      items,
      pending,
      ready: items.filter((item) => item.state === "Ready").length,
      failed: items.filter((item) => item.state === "Error").length,
      queued: items.filter((item) => item.state === "Queued").length,
      unfinished:
        pending > 0 ||
        [...this.records.values()].some(
          (record) => record.item.state === "Error" && Boolean(record.file),
        ),
      readyRevision: this.readyRevision,
      settledRevision: this.settledRevision,
      sessionMessage: this.sessionMessage,
    };
    for (const listener of this.listeners) listener();
  }
  private pump() {
    for (const [id, record] of this.records) {
      if (this.active.size >= 2) break;
      if (record.item.state !== "Queued" || !record.file) continue;
      const controller = new AbortController();
      this.active.set(id, controller);
      record.item = { ...record.item, state: "Uploading", progress: undefined };
      void this.run(id, record, controller);
    }
    if (
      this.cycle &&
      !this.active.size &&
      ![...this.records.values()].some(
        (record) => record.item.state === "Queued",
      )
    ) {
      this.cycle = false;
      this.settledRevision++;
    }
    this.emit();
  }
  private async run(
    id: string,
    record: RecordItem,
    controller: AbortController,
  ) {
    const current = () =>
      this.active.get(id) === controller && !controller.signal.aborted;
    try {
      if (!record.remote)
        record.remote = await this.transport.initiate(
          record.file!,
          controller.signal,
        );
      if (!current()) return;
      if (!record.transferred) {
        await this.transport.transfer(
          record.remote.uploadUrl,
          record.file!,
          controller.signal,
          (progress) => {
            if (current()) {
              record.item = { ...record.item, progress };
              this.emit();
            }
          },
        );
        if (!current()) return;
        record.transferred = true;
      }
      record.item = {
        ...record.item,
        state: "Processing",
        progress: undefined,
      };
      this.emit();
      await this.transport.complete(record.remote.id, controller.signal);
      if (!current()) return;
      record.item = {
        ...record.item,
        state: "Ready",
        photoId: record.remote.id,
        retryable: false,
      };
      record.file = undefined;
      this.readyRevision++;
    } catch (failure) {
      if (!current()) return;
      const status =
        failure instanceof PhotoUploadError ? failure.status : undefined;
      if (status === 401 || status === 403) {
        this.stop(
          undefined,
          "Uploads stopped because your sign-in ended. Photos already uploaded remain in the library.",
        );
        return;
      }
      if (status === 404 || status === 410) {
        record.remote = undefined;
        record.transferred = false;
      }
      record.item = {
        ...record.item,
        state: "Error",
        progress: undefined,
        error:
          failure instanceof Error && !(failure instanceof TypeError)
            ? failure.message
            : "Upload failed. Check your connection and retry.",
        retryable: status !== 400 && status !== 413,
      };
      if (!record.item.retryable) record.file = undefined;
    } finally {
      if (this.active.get(id) === controller) {
        this.active.delete(id);
        this.pump();
      }
    }
  }
}
