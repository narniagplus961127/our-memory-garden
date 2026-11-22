import test from "node:test";
import assert from "node:assert/strict";
import {
  readBoundedText,
  RequestSizeError,
} from "../../src/lib/server/request-body.ts";
import {
  RequestRateLimiter,
  rateLimitClient,
} from "../../src/lib/server/request-rate-limit.ts";

function streamingRequest(chunks, headers = {}, onCancel = () => {}) {
  return new Request("http://127.0.0.1/api/test", {
    method: "POST",
    headers,
    duplex: "half",
    body: new ReadableStream({
      pull(controller) {
        if (chunks.length) controller.enqueue(chunks.shift());
        else controller.close();
      },
      cancel: onCancel,
    }),
  });
}
test("request bounds count bytes, preserve split UTF-8 and cancel oversized streams", async () => {
  const bytes = new TextEncoder().encode("中文 🌱");
  assert.equal(
    await readBoundedText(
      streamingRequest([bytes.slice(0, 2), bytes.slice(2)]),
      bytes.length,
    ),
    "中文 🌱",
  );
  let cancelled = false;
  await assert.rejects(
    readBoundedText(
      streamingRequest(
        [new Uint8Array(4), new Uint8Array(4), new Uint8Array(4)],
        {},
        () => {
          cancelled = true;
        },
      ),
      5,
    ),
    RequestSizeError,
  );
  assert.equal(cancelled, true);
  await assert.rejects(
    readBoundedText(streamingRequest([bytes], { "content-length": "1" }), 2),
    RequestSizeError,
  );
  await assert.rejects(
    readBoundedText(streamingRequest([bytes], { "content-length": "999" }), 2),
    RequestSizeError,
  );
});
test("rate limits isolate clients/scopes, expire, and resist active-key eviction", () => {
  let now = 0;
  const limiter = new RequestRateLimiter(2, () => now);
  assert.equal(limiter.retryAfter("login:one", 2, 60000), 0);
  assert.equal(limiter.retryAfter("login:one", 2, 60000), 0);
  assert.equal(limiter.retryAfter("login:one", 2, 60000), 60);
  assert.equal(limiter.retryAfter("login:two", 2, 60000), 0);
  assert.equal(limiter.retryAfter("new:key", 2, 60000), 60);
  assert.equal(limiter.retryAfter("login:one", 2, 60000), 60);
  now = 59001;
  assert.equal(limiter.retryAfter("login:one", 2, 60000), 1);
  now = 60000;
  assert.equal(limiter.retryAfter("new:key", 2, 60000), 0);
});
test("caller-supplied forwarded headers are not trusted outside Vercel", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.1",
    "x-vercel-forwarded-for": "198.51.100.2",
  });
  assert.equal(rateLimitClient(headers, false), "shared");
  const key = rateLimitClient(headers, true);
  assert.notEqual(key, "shared");
  assert.equal(key.includes("198.51.100"), false);
  headers.set("x-forwarded-for", "198.51.100.3");
  assert.equal(rateLimitClient(headers, true), key);
  headers.set("x-vercel-forwarded-for", "not-an-address");
  assert.equal(rateLimitClient(headers, true), "shared");
});
