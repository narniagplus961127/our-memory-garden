import {
  PhotoUploadError,
  type PhotoUploadTransport,
} from "./photo-upload-queue";

async function post(
  path: string,
  body: unknown,
  signal: AbortSignal,
  timeout: number,
) {
  const request = new AbortController();
  const abort = () => request.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) request.abort();
  const timer = setTimeout(() => request.abort(), timeout);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: request.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok)
      throw new PhotoUploadError(
        result?.error || "Could not upload the photo. Please retry.",
        response.status,
      );
    if (!result)
      throw new PhotoUploadError(
        "The server response was interrupted. Please retry.",
      );
    return result;
  } catch (failure) {
    if (request.signal.aborted && !signal.aborted)
      throw new PhotoUploadError("The upload timed out. Please retry.");
    throw failure;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
const fingerprints = new WeakMap<File, Promise<string>>();
async function fingerprint(file: File, signal: AbortSignal) {
  signal.throwIfAborted();
  let pending = fingerprints.get(file);
  if (!pending) {
    pending = file
      .arrayBuffer()
      .then((bytes) => crypto.subtle.digest("SHA-256", bytes))
      .then((hash) =>
        [...new Uint8Array(hash)]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join(""),
      );
    fingerprints.set(file, pending);
    void pending.catch(() => fingerprints.delete(file));
  }
  const hash = await pending;
  signal.throwIfAborted();
  return hash;
}
export const photoUploadTransport: PhotoUploadTransport = {
  fingerprint,
  initiate: async (file, signal, forceDuplicate = false) =>
    post(
      "/api/media/uploads",
      {
        name: file.name,
        size: file.size,
        type: file.type,
        sha256: await fingerprint(file, signal),
        forceDuplicate,
      },
      signal,
      30000,
    ),
  reuse: async (id, file, signal) =>
    post(
      "/api/media/uploads",
      { reuseId: id, size: file.size, sha256: await fingerprint(file, signal) },
      signal,
      30000,
    ),
  complete: (id, signal) =>
    post("/api/media/" + id + "/complete", {}, signal, 300000),
  transfer: (url, file, signal, progress) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const abort = () => xhr.abort();
      const cleanup = () => signal.removeEventListener("abort", abort);
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.timeout = 180000;
      xhr.upload.onprogress = (event) =>
        progress(
          event.lengthComputable
            ? Math.round((event.loaded / event.total) * 100)
            : undefined,
        );
      xhr.onload = () => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else
          reject(
            new PhotoUploadError(
              "Upload failed. Check your connection and retry.",
            ),
          );
      };
      xhr.onerror = () => {
        cleanup();
        reject(
          new PhotoUploadError(
            "Upload failed. Check your connection and retry.",
          ),
        );
      };
      xhr.ontimeout = () => {
        cleanup();
        reject(new PhotoUploadError("Upload timed out. Please retry."));
      };
      xhr.onabort = () => {
        cleanup();
        reject(new DOMException("Upload stopped", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) {
        cleanup();
        reject(new DOMException("Upload stopped", "AbortError"));
        return;
      }
      progress(0);
      xhr.send(file);
    }),
};
