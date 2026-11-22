import test from "node:test";
import assert from "node:assert/strict";
import { PhotoByteCache } from "../../src/lib/server/photo-byte-cache.ts";

test("optimized bytes expire and least-recently-used entries respect the memory budget", () => {
  let now = 0;
  const cache = new PhotoByteCache(6, 4, 100, () => now);
  cache.put("first", new Uint8Array([1, 2, 3]));
  cache.put("second", new Uint8Array([4, 5, 6]));
  assert.deepEqual(cache.get("first"), new Uint8Array([1, 2, 3]));
  cache.put("third", new Uint8Array([7, 8, 9]));
  assert.equal(cache.get("second"), undefined);
  now = 100;
  assert.equal(cache.get("first"), undefined);
  assert.equal(cache.get("third"), undefined);
});

test("oversized bytes cannot flush the cache and replacing entries accounts for their size", () => {
  const cache = new PhotoByteCache(6, 4);
  cache.put("small", new Uint8Array([1, 2]));
  cache.put("oversized", new Uint8Array(5));
  assert.ok(cache.get("small"));
  assert.equal(cache.get("oversized"), undefined);
  cache.put("small", new Uint8Array(4));
  cache.put("another", new Uint8Array(2));
  assert.equal(cache.get("small").length, 4);
  assert.equal(cache.get("another").length, 2);
});

test("tiny photos also respect a fixed entry-count bound", () => {
  const cache = new PhotoByteCache();
  for (let id = 0; id < 257; id++) cache.put(String(id), new Uint8Array([1]));
  assert.equal(cache.get("0"), undefined);
  assert.ok(cache.get("256"));
});
