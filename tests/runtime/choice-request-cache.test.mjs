import test from "node:test";
import assert from "node:assert/strict";
import {
  loadChoiceData,
  clearChoiceRequest,
} from "../../src/lib/choice-request-cache.ts";

test("choice requests share concurrent work, expire, and retry failures", async (t) => {
  let now = 0;
  let calls = 0;
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ pages: [] });
  });
  const path = "/api/page-choices?search=shared-unit";
  const one = loadChoiceData(path);
  const two = loadChoiceData(path);
  assert.equal(one, two);
  await one;
  await loadChoiceData(path);
  assert.equal(calls, 1);
  now = 30_001;
  await loadChoiceData(path);
  assert.equal(calls, 2);
  clearChoiceRequest(path);
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({}, { status: 500 }),
  );
  await assert.rejects(loadChoiceData(path));
  t.mock.method(globalThis, "fetch", async () => Response.json({ pages: [] }));
  await assert.doesNotReject(loadChoiceData(path));
});
test("choice cache bounds entries and discards private results after authorization failure", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ pages: [] });
  });
  const prefix = "/api/page-choices?search=bound-unit-";
  for (let i = 0; i < 21; i++) await loadChoiceData(prefix + i);
  await loadChoiceData(prefix + "0");
  assert.equal(calls, 22);
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({}, { status: 401 }),
  );
  await assert.rejects(loadChoiceData(prefix + "denied"));
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ pages: [] });
  });
  await loadChoiceData(prefix + "0");
  assert.equal(calls, 23);
});
