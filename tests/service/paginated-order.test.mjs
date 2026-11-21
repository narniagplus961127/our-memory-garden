import test from "node:test";
import assert from "node:assert/strict";
import { mergeVisibleOrder } from "../../src/lib/admin-list-order.ts";
test("reordering a batch preserves hidden pages and includes new visible pages", () => {
  assert.deepEqual(
    mergeVisibleOrder(["a", "b", "c", "d", "e"], ["b", "d"], ["d", "b"]),
    ["a", "d", "c", "b", "e"],
  );
  assert.deepEqual(
    mergeVisibleOrder(["hidden", "a"], ["a", "new"], ["new", "a"]),
    ["hidden", "new", "a"],
  );
  assert.deepEqual(mergeVisibleOrder([], ["a", "b"], ["b", "a"]), ["b", "a"]);
});
