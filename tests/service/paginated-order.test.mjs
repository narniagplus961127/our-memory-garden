import test from "node:test";
import assert from "node:assert/strict";
import { mergeVisibleOrder } from "../../src/lib/admin-list-order.ts";
import postgres from "postgres";
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

test("saving a later page batch retains unranked earlier pages and checks the version", async (t) => {
  const connection = process.env.DATABASE_URL;
  if (!connection || new URL(connection).hostname !== "127.0.0.1")
    return t.skip("Needs isolated local fixtures");
  const sql = postgres(connection, { max: 1 }),
    base = process.env.TEST_BASE_URL;
  const auth = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    }),
  });
  const cookie = auth.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  const [admin] = await sql`select user_id from garden_administrators limit 1`;
  const prefix = "order-batch-" + crypto.randomUUID();
  try {
    for (let i = 0; i < 30; i++)
      await sql`insert into pages(title,slug,created_by,updated_by) values(${prefix + i},${prefix + i},${admin.user_id},${admin.user_id})`;
    const [order] =
      await sql`update garden_admin_list_order set ids='{}',version=version+1 where list='pages' returning version`;
    const all = (
      await sql`select id from pages where deleted_at is null order by updated_at desc,id`
    ).map((p) => p.id);
    const shown = all.slice(24, 48),
      next = shown.toReversed();
    const save = () =>
      fetch(base + "/api/admin-list-order", {
        method: "PUT",
        headers: {
          Cookie: cookie,
          Origin: base,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          list: "pages",
          ids: next,
          version: order.version,
          partial: true,
        }),
      });
    const response = await save();
    assert.equal(response.status, 200);
    const saved = await response.json();
    assert.deepEqual(saved.ids, mergeVisibleOrder(all, shown, next));
    assert.deepEqual(saved.ids.slice(0, 24), all.slice(0, 24));
    assert.equal((await save()).status, 409);
  } finally {
    await sql`delete from pages where strpos(title,${prefix})=1`;
    await sql.end();
  }
});
