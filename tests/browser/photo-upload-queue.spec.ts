import { test, expect } from "@playwright/test";
import {
  PhotoUploadQueue,
  PhotoUploadError,
  type PhotoUploadTransport,
} from "../../src/lib/photo-upload-queue";

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const file = (name: string) =>
  new File(["image bytes"], name, { type: "image/jpeg" });

test("identical queued files wait for verification without occupying unrelated upload slots", async () => {
  const processing = gate();
  const ready = new Set<string>();
  const transfers: string[] = [];
  const reused: string[] = [];
  const fingerprint = (photo: File) =>
    photo.name === "other.jpg" ? "other" : "same";
  const queue = new PhotoUploadQueue({
    fingerprint: async (photo) => fingerprint(photo),
    initiate: async (photo) =>
      ready.has(fingerprint(photo))
        ? { duplicate: { id: "a.jpg", name: "a.jpg" } }
        : { id: photo.name, uploadUrl: photo.name },
    transfer: async (url) => {
      transfers.push(url);
    },
    complete: async (id) => {
      if (id === "a.jpg") await processing.promise;
      ready.add(id === "other.jpg" ? "other" : "same");
    },
    reuse: async (id) => {
      reused.push(id);
      return { id };
    },
  });
  queue.enqueue("owner", [file("a.jpg"), file("b.jpg"), file("other.jpg")]);
  await expect.poll(() => queue.getSnapshot().ready).toBe(1);
  expect(transfers.sort()).toEqual(["a.jpg", "other.jpg"]);
  expect(
    queue.getSnapshot().items.find((item) => item.name === "b.jpg")?.state,
  ).toBe("Waiting");
  processing.resolve();
  await expect.poll(() => queue.getSnapshot().duplicates).toBe(1);
  expect(queue.getSnapshot().unfinished).toBe(true);
  queue.reuseDuplicates();
  await expect.poll(() => queue.getSnapshot().ready).toBe(3);
  expect(reused).toEqual(["a.jpg"]);
  expect(transfers).toHaveLength(2);
  expect(queue.getSnapshot().unfinished).toBe(false);
});

test("duplicate choices allow another copy and retry an unavailable reuse without losing the file", async () => {
  let available = true;
  let copied = false;
  let transfers = 0;
  const queue = new PhotoUploadQueue({
    initiate: async (_, __, force) => {
      if (force) copied = true;
      return available && !force
        ? { duplicate: { id: "existing", name: "Original" } }
        : { id: "new", uploadUrl: "new" };
    },
    transfer: async () => {
      transfers++;
    },
    complete: async () => {},
    reuse: async () => {
      throw new PhotoUploadError("Photo removed", 409);
    },
  });
  queue.enqueue("owner", [file("copy.jpg")]);
  await expect.poll(() => queue.getSnapshot().duplicates).toBe(1);
  queue.resolveDuplicate(queue.getSnapshot().items[0].id, false);
  await expect.poll(() => queue.getSnapshot().ready).toBe(1);
  expect(copied).toBe(true);
  queue.enqueue("owner", [file("reuse.jpg")]);
  await expect.poll(() => queue.getSnapshot().duplicates).toBe(1);
  const id = queue.getSnapshot().items[0].id;
  queue.resolveDuplicate(id, true);
  await expect.poll(() => queue.getSnapshot().failed).toBe(1);
  available = false;
  queue.retry(id);
  await expect.poll(() => queue.getSnapshot().ready).toBe(1);
  expect(transfers).toBe(2);
});

test("an account change during fingerprinting cannot initiate a stale upload", async () => {
  const hashing = gate();
  let calls = 0;
  const queue = new PhotoUploadQueue({
    fingerprint: async () => {
      await hashing.promise;
      return "same";
    },
    initiate: async () => {
      calls++;
      return { id: "old", uploadUrl: "old" };
    },
    transfer: async () => {},
    complete: async () => {},
  });
  queue.enqueue("old", [file("old.jpg")]);
  queue.bindAccount("new");
  hashing.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(calls).toBe(0);
  expect(queue.getSnapshot().items).toEqual([]);
});

test("one queue shares two slots across batches and cancelling queued files preserves active photos", async () => {
  const gates = new Map<string, ReturnType<typeof gate>>(),
    completed: string[] = [];
  const transport: PhotoUploadTransport = {
    initiate: async (photo) => ({ id: photo.name, uploadUrl: photo.name }),
    transfer: async (url, _, __, progress) => {
      const pending = gate();
      gates.set(url, pending);
      progress(50);
      await pending.promise;
    },
    complete: async (id) => {
      completed.push(id);
    },
  };
  const queue = new PhotoUploadQueue(transport);
  queue.enqueue("owner", [file("a.jpg"), file("b.jpg"), file("c.jpg")]);
  queue.enqueue("owner", [file("d.jpg"), file("e.jpg")]);
  await expect.poll(() => gates.size).toBe(2);
  expect(queue.getSnapshot().queued).toBe(3);
  queue.cancelQueued();
  expect(
    queue.getSnapshot().items.filter((item) => item.state === "Cancelled"),
  ).toHaveLength(3);
  gates.get("a.jpg")!.resolve();
  gates.get("b.jpg")!.resolve();
  await expect.poll(() => queue.getSnapshot().ready).toBe(2);
  expect(completed.sort()).toEqual(["a.jpg", "b.jpg"]);
  expect(queue.getSnapshot().unfinished).toBe(false);
});

test("a lost processing response retries the same upload without uploading another copy", async () => {
  let initiated = 0,
    transferred = 0,
    completed = 0;
  const queue = new PhotoUploadQueue({
    initiate: async () => {
      initiated++;
      return { id: "same-photo", uploadUrl: "signed-upload" };
    },
    transfer: async () => {
      transferred++;
    },
    complete: async (id) => {
      expect(id).toBe("same-photo");
      if (++completed === 1)
        throw new PhotoUploadError("Response interrupted", 503);
    },
  });
  queue.enqueue("owner", [file("a.jpg")]);
  await expect.poll(() => queue.getSnapshot().failed).toBe(1);
  const id = queue.getSnapshot().items[0].id;
  queue.retry(id);
  queue.retry(id);
  await expect.poll(() => queue.getSnapshot().ready).toBe(1);
  expect({ initiated, transferred, completed }).toEqual({
    initiated: 1,
    transferred: 1,
    completed: 2,
  });
  queue.retry(id);
  expect(completed).toBe(2);
});

test("an account change stops old callbacks and session expiry prevents queued uploads", async () => {
  const pending = gate(),
    completed: string[] = [];
  const queue = new PhotoUploadQueue({
    initiate: async (photo) => ({ id: photo.name, uploadUrl: photo.name }),
    transfer: async () => pending.promise,
    complete: async (id) => {
      completed.push(id);
    },
  });
  queue.enqueue("old-owner", [file("old.jpg")]);
  queue.bindAccount("new-owner");
  pending.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(completed).toEqual([]);
  expect(queue.getSnapshot().items).toEqual([]);
  let calls = 0;
  const expired = new PhotoUploadQueue({
    initiate: async () => {
      calls++;
      throw new PhotoUploadError("Signed out", 401);
    },
    transfer: async () => {},
    complete: async () => {},
  });
  expired.enqueue(
    "owner",
    Array.from({ length: 6 }, (_, i) => file(i + ".jpg")),
  );
  await expect
    .poll(() => expired.getSnapshot().sessionMessage)
    .toContain("sign-in ended");
  expect(calls).toBeLessThanOrEqual(2);
  expect(expired.getSnapshot().unfinished).toBe(false);
  expect(expired.getSnapshot().items).toEqual([]);
});
