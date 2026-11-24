import { MAX_PHOTO_BYTES } from "./media";

export type PhotoUploadState =
  | "Queued"
  | "Checking"
  | "Waiting"
  | "Duplicate"
  | "Reusing"
  | "Uploading"
  | "Processing"
  | "Ready"
  | "Error"
  | "Cancelled";
export type PhotoUploadItem = {
  id: string;
  name: string;
  state: PhotoUploadState;
  progress?: number;
  error?: string;
  retryable: boolean;
  photoId?: string;
  duplicateName?: string;
  reused?: boolean;
};
export type PhotoUploadSnapshot = {
  items: PhotoUploadItem[];
  pending: number;
  ready: number;
  failed: number;
  queued: number;
  duplicates: number;
  unfinished: boolean;
  readyRevision: number;
  settledRevision: number;
  sessionMessage: string;
};
type RemoteUpload = { id: string; uploadUrl: string };
export type PhotoUploadTransport = {
  fingerprint?: (file: File, signal: AbortSignal) => Promise<string>;
  initiate: (
    file: File,
    signal: AbortSignal,
    forceDuplicate?: boolean,
  ) => Promise<RemoteUpload | { duplicate: { id: string; name: string } }>;
  reuse?: (
    id: string,
    file: File,
    signal: AbortSignal,
  ) => Promise<{ id: string }>;
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
  fingerprint?: string;
  duplicate?: { id: string; name: string };
  forceDuplicate?: boolean;
  reuse?: boolean;
};
const emptySnapshot: PhotoUploadSnapshot = {
  items: [],
  pending: 0,
  ready: 0,
  failed: 0,
  queued: 0,
  duplicates: 0,
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
    record.reuse = false;
    record.duplicate = undefined;
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
  resolveDuplicate(id: string, reuse: boolean) {
    const record = this.records.get(id);
    if (!record?.file || record.item.state !== "Duplicate") return;
    record.reuse = reuse;
    record.forceDuplicate = !reuse;
    record.item = { ...record.item, state: "Queued", error: undefined };
    this.cycle = true;
    this.pump();
  }
  reuseDuplicates() {
    for (const [id, record] of this.records)
      if (record.item.state === "Duplicate") this.resolveDuplicate(id, true);
  }
  cancelQueued() {
    for (const record of this.records.values())
      if (["Queued", "Waiting", "Duplicate"].includes(record.item.state)) {
        record.item = { ...record.item, state: "Cancelled" };
        record.file = undefined;
      }
    this.pump();
  }
  remove(id: string) {
    const record = this.records.get(id);
    if (record && !this.active.has(id)) {
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
      [
        "Queued",
        "Checking",
        "Waiting",
        "Reusing",
        "Uploading",
        "Processing",
      ].includes(item.state),
    ).length;
    this.snapshot = {
      items,
      pending,
      ready: items.filter((item) => item.state === "Ready").length,
      failed: items.filter((item) => item.state === "Error").length,
      queued: items.filter((item) => item.state === "Queued").length,
      duplicates: items.filter((item) => item.state === "Duplicate").length,
      unfinished:
        pending > 0 ||
        [...this.records.values()].some(
          (record) =>
            ["Error", "Duplicate"].includes(record.item.state) &&
            Boolean(record.file),
        ),
      readyRevision: this.readyRevision,
      settledRevision: this.settledRevision,
      sessionMessage: this.sessionMessage,
    };
    for (const listener of this.listeners) listener();
  }
  private pump() {
    for (const record of this.records.values()) {
      if (
        record.item.state === "Waiting" &&
        ![...this.active.keys()].some(
          (id) => this.records.get(id)?.fingerprint === record.fingerprint,
        )
      )
        record.item = { ...record.item, state: "Queued" };
    }
    for (const [id, record] of this.records) {
      if (this.active.size >= 2) break;
      if (record.item.state !== "Queued" || !record.file) continue;
      const controller = new AbortController();
      this.active.set(id, controller);
      record.item = {
        ...record.item,
        state: this.transport.fingerprint ? "Checking" : "Uploading",
        progress: undefined,
      };
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
      if (!record.fingerprint && this.transport.fingerprint) {
        record.fingerprint = await this.transport.fingerprint(
          record.file!,
          controller.signal,
        );
        if (!current()) return;
      }
      if (record.reuse && record.duplicate && this.transport.reuse) {
        record.item = { ...record.item, state: "Reusing" };
        this.emit();
        const reused = await this.transport.reuse(
          record.duplicate.id,
          record.file!,
          controller.signal,
        );
        if (!current()) return;
        record.item = {
          ...record.item,
          state: "Ready",
          photoId: reused.id,
          reused: true,
          retryable: false,
        };
        record.file = undefined;
        this.readyRevision++;
        return;
      }
      if (
        !record.forceDuplicate &&
        record.fingerprint &&
        [...this.active.keys()].some(
          (otherId) =>
            otherId !== id &&
            this.records.get(otherId)?.fingerprint === record.fingerprint &&
            this.records.get(otherId)?.item.state !== "Waiting",
        )
      ) {
        record.item = { ...record.item, state: "Waiting" };
        return;
      }
      if (!record.remote) {
        const result = await this.transport.initiate(
          record.file!,
          controller.signal,
          record.forceDuplicate,
        );
        if (!current()) return;
        if ("duplicate" in result) {
          record.duplicate = result.duplicate;
          record.item = {
            ...record.item,
            state: "Duplicate",
            duplicateName: result.duplicate.name,
            progress: undefined,
          };
          return;
        }
        record.remote = result;
      }
      if (!current()) return;
      if (!record.transferred) {
        record.item = { ...record.item, state: "Uploading" };
        this.emit();
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
