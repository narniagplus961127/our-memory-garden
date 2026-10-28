import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
async function login(email, password) {
  const response = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
async function call(path, method = "GET", data, cookie) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

test("public access follows saved visibility while both administrators retain access", async () => {
  const owner = await login(
    process.env.TEST_ADMIN_EMAIL,
    process.env.TEST_ADMIN_PASSWORD,
  );
  const other = await login(
    process.env.TEST_OTHER_EMAIL,
    process.env.TEST_OTHER_PASSWORD,
  );
  const created = await call(
    "/api/pages",
    "POST",
    { title: "A changing garden" },
    owner,
  );
  assert.equal(created.status, 201);
  let page = await created.json();
  const path = "/api/pages/" + page.id;
  assert.equal((await call(path)).status, 404);
  const visible = await call(
    path,
    "PATCH",
    { visibility: "public", version: page.version },
    owner,
  );
  assert.equal(visible.status, 200);
  page = await visible.json();
  assert.equal((await call(path)).status, 200);
  assert.equal(
    (
      await call(path, "PATCH", {
        visibility: "private",
        version: page.version,
      })
    ).status,
    401,
  );
  const hidden = await call(
    path,
    "PATCH",
    { visibility: "private", version: page.version },
    other,
  );
  assert.equal(hidden.status, 200);
  assert.equal((await call(path)).status, 404);
  assert.equal((await call(path, "GET", undefined, owner)).status, 200);
  assert.equal((await call(path, "GET", undefined, other)).status, 200);
});

test("homepage selection accepts only public pages and saved homepage edits are immediately public", async () => {
  const owner = await login(
    process.env.TEST_ADMIN_EMAIL,
    process.env.TEST_ADMIN_PASSWORD,
  );
  const created = await call(
    "/api/pages",
    "POST",
    { title: "The garden entrance" },
    owner,
  );
  let page = await created.json();
  assert.equal(
    (await call("/api/homepage", "PATCH", { id: page.id }, owner)).status,
    409,
  );
  page = await (
    await call(
      "/api/pages/" + page.id,
      "PATCH",
      { visibility: "public", version: page.version },
      owner,
    )
  ).json();
  assert.equal(
    (await call("/api/homepage", "PATCH", { id: page.id })).status,
    401,
  );
  assert.equal(
    (await call("/api/homepage", "PATCH", { id: page.id }, owner)).status,
    200,
  );
  assert.equal((await (await call("/api/homepage")).json()).id, page.id);
  assert.equal(
    (
      await call(
        "/api/pages/" + page.id,
        "PATCH",
        { visibility: "private", version: page.version },
        owner,
      )
    ).status,
    409,
  );
  const updated = await call(
    "/api/pages/" + page.id,
    "PATCH",
    {
      title: "Our flourishing garden",
      text: "We planted rosemary at the entrance.",
      version: page.version,
    },
    owner,
  );
  assert.equal(updated.status, 200);
  const visitor = await fetch(base + "/");
  assert.equal(visitor.status, 200);
  assert.match(await visitor.text(), /We planted rosemary at the entrance\./);
});

test("the database protects the active homepage from hiding, trash and deletion", async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const [home] =
      await sql`select homepage_id from garden_settings where singleton=true`;
    assert.ok(home?.homepage_id);
    for (const operation of [
      () =>
        sql`update pages set visibility='private' where id=${home.homepage_id}`,
      () => sql`update pages set deleted_at=now() where id=${home.homepage_id}`,
      () => sql`delete from pages where id=${home.homepage_id}`,
    ])
      await assert.rejects(operation, { code: "23514" });
    assert.equal((await call("/api/homepage")).status, 200);
  } finally {
    await sql.end();
  }
});
