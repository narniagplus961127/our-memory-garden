import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3013";
test("page choices are authorized, lightweight, searchable and stable across result batches", async (t) => {
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  assert.equal(new URL(base).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  let fixtureIds = [];
  t.after(async () => {
    try {
      if (fixtureIds.length)
        await sql`delete from pages where id in ${sql(fixtureIds)}`;
    } finally {
      await sql.end();
    }
  });
  const login = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  const request = (params, session = cookie) =>
    fetch(base + "/api/page-choices?" + new URLSearchParams(params), {
      headers: session ? { Cookie: session } : {},
    });
  assert.equal((await request({}, null)).status, 401);
  const { betterAuth } = await import("better-auth");
  const { localAuthOptions } =
    await import("../../src/lib/server/local-auth.ts");
  const options = localAuthOptions();
  t.after(() => options.database.end());
  const outsider = await betterAuth(options).api.signInEmail({
    body: {
      email: process.env.TEST_OUTSIDER_EMAIL,
      password: process.env.TEST_OUTSIDER_PASSWORD,
    },
    asResponse: true,
  });
  assert.equal(outsider.status, 200);
  const outsiderCookie = outsider.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  assert.equal((await request({}, outsiderCookie)).status, 401);
  const [admin] =
    await sql`select user_id from garden_administrators where lower(email)=${process.env.TEST_ADMIN_EMAIL.toLowerCase()}`;
  const prefix = "Choices " + crypto.randomUUID();
  const rows = Array.from({ length: 68 }, (_, i) => {
    const id = crypto.randomUUID();
    return {
      id,
      title:
        prefix +
        (i < 65
          ? i % 2
            ? " TIED"
            : " tied"
          : i === 65
            ? " 一起走过"
            : i === 66
              ? " %_bloom"
              : " trashed"),
      slug: i === 65 ? "only-url-" + id : "choice-" + id,
      visibility: i % 2 ? "private" : "public",
      deleted_at: i === 67 ? new Date() : null,
      created_by: admin.user_id,
      updated_by: admin.user_id,
      content: {
        root: { props: {} },
        content: [
          {
            type: "Section",
            props: {
              id: "choice-section-" + id,
              content: [
                {
                  type: "Text",
                  props: {
                    id: "choice-text-" + id,
                    text: "PRIVATE-DOCUMENT-BYTES".repeat(6000),
                  },
                },
              ],
            },
          },
        ],
      },
    };
  });
  fixtureIds = rows.map((row) => row.id);
  await sql`insert into pages ${sql(rows)}`;
  let cursor = "";
  const found = [];
  const sizes = [];
  do {
    const response = await request({
      search: prefix,
      ...(cursor ? { after: cursor } : {}),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    const text = await response.text();
    assert.ok(Buffer.byteLength(text) < 20_000);
    assert.equal(text.includes("PRIVATE-DOCUMENT-BYTES"), false);
    const result = JSON.parse(text);
    sizes.push(result.pages.length);
    for (const page of result.pages)
      assert.deepEqual(Object.keys(page).sort(), [
        "id",
        "slug",
        "title",
        "visibility",
      ]);
    found.push(...result.pages);
    cursor = result.nextCursor;
    if (sizes.length === 1)
      await sql`delete from pages where id=${result.pages.at(-1).id}`;
  } while (cursor);
  assert.deepEqual(sizes, [30, 30, 7]);
  assert.equal(new Set(found.map((p) => p.id)).size, 67);
  assert.ok(found.some((p) => p.visibility === "private"));
  assert.equal(
    found.some((p) => p.id === rows[67].id),
    false,
  );
  const chinese = await (
    await request({ search: prefix + " 一起走过" })
  ).json();
  assert.deepEqual(
    chinese.pages.map((p) => p.id),
    [rows[65].id],
  );
  const url = await (
    await request({ search: rows[65].slug.toUpperCase() })
  ).json();
  assert.deepEqual(
    url.pages.map((p) => p.id),
    [rows[65].id],
  );
  const literal = await (await request({ search: prefix + " %_" })).json();
  assert.deepEqual(
    literal.pages.map((p) => p.id),
    [rows[66].id],
  );
  const selected = await (
    await request({
      ids: [rows[65].id, rows[67].id, crypto.randomUUID()].join(","),
    })
  ).json();
  assert.deepEqual(
    selected.pages.map((p) => p.id),
    [rows[65].id],
  );
  assert.equal(selected.nextCursor, null);
  for (const params of [
    { after: "not-a-cursor" },
    { after: Buffer.from("{}").toString("base64url") },
    { search: "x".repeat(201) },
    { search: "\0" },
    { ids: "bad-id" },
    { ids: Array.from({ length: 101 }, () => crypto.randomUUID()).join(",") },
  ]) {
    assert.equal((await request(params)).status, 400);
  }
});
