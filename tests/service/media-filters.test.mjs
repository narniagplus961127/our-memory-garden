import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { login, call } from "./media.test.mjs";

test("media filters respect upload dates and current references across library and grid picker", async (t) => {
  if (
    !process.env.DATABASE_URL ||
    new URL(process.env.DATABASE_URL).hostname !== "127.0.0.1"
  )
    return t.skip("Needs isolated local fixtures");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const cookie = await login(),
    prefix = "filtered-" + crypto.randomUUID();
  const [admin] = await sql`select user_id from garden_administrators limit 1`;
  const [page] =
    await sql`insert into pages(title,slug,created_by,updated_by) values(${prefix},${prefix},${admin.user_id},${admin.user_id}) returning id`;
  const ids = [];
  try {
    for (const date of [
      "2024-02-01T00:00:00Z",
      "2024-02-29T23:59:59Z",
      "2024-03-01T00:00:00Z",
    ]) {
      const id = crypto.randomUUID();
      ids.push(id);
      await sql`insert into media_photos(id,name,status,expected_bytes,original_key,display_key,staging_key,created_by,width,height,created_at) values(${id},${prefix},'ready',1,${id + "/original"},${id + "/display"},${id + "/staging"},${admin.user_id},640,480,${date})`;
    }
    await sql`update pages set cover_photo_id=${ids[0]} where id=${page.id}`;
    const read = async (params) => {
      const response = await call(
        "/api/media?" +
          new URLSearchParams({ view: "library", search: prefix, ...params }),
        "GET",
        undefined,
        cookie,
      );
      assert.equal(response.status, 200);
      return response.json();
    };
    assert.deepEqual(
      (await read({ from: "2024-02-01", to: "2024-02-29" })).photos.map(
        (p) => p.id,
      ),
      [ids[1], ids[0]],
    );
    assert.deepEqual(
      (await read({ usage: "unused" })).photos.map((p) => p.id),
      [ids[2], ids[1]],
    );
    assert.deepEqual(
      (await read({ pageId: page.id })).photos.map((p) => p.id),
      [ids[0]],
    );
    assert.equal((await read({ usage: "public" })).photos.length, 0);
    await sql`update pages set visibility='public' where id=${page.id}`;
    assert.deepEqual(
      (await read({ usage: "public" })).photos.map((p) => p.id),
      [ids[0]],
    );
    const picker = await call(
      "/api/media?" +
        new URLSearchParams({
          view: "grid-picker",
          search: prefix,
          usage: "unused",
        }),
      "GET",
      undefined,
      cookie,
    );
    assert.deepEqual(
      (await picker.json()).photos.map((p) => p.photoId),
      [ids[2], ids[1]],
    );
    const events = await call(
      "/api/media?view=events&search=" + prefix,
      "GET",
      undefined,
      cookie,
    );
    assert.deepEqual(
      (await events.json()).map((p) => p.id),
      [page.id],
    );
    for (const filter of [
      { from: "2024-02-30" },
      { from: "0000-01-01" },
      { from: "2024-03-02", to: "2024-03-01" },
      { pageId: "invalid" },
      { usage: "invented" },
    ])
      assert.equal(
        (
          await call(
            "/api/media?" + new URLSearchParams({ view: "library", ...filter }),
            "GET",
            undefined,
            cookie,
          )
        ).status,
        400,
      );
    assert.equal((await call("/api/media?view=events")).status, 401);
  } finally {
    await sql`delete from pages where id=${page.id}`;
    await sql`delete from media_photos where id=any(${sql.array(ids, 2950)}::uuid[])`;
    await sql.end();
  }
});
