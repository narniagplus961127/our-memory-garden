import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
async function login(
  email = process.env.TEST_ADMIN_EMAIL,
  password = process.env.TEST_ADMIN_PASSWORD,
) {
  const r = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
}
async function call(path, method, data, cookie = "", origin = base) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
test("page address changes invalidate old address while stable references resolve the current address", async () => {
  const cookie = await login();
  const p = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Address " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  let r = await call(
    "/api/pages/" + p.id + "/address",
    "PATCH",
    { slug: "rosemary-" + p.id, expectedSlug: p.slug },
    cookie,
  );
  assert.equal(r.status, 200);
  const changed = await r.json();
  assert.equal(changed.slug, "rosemary-" + p.id);
  assert.equal(changed.version, p.version);
  assert.equal(
    (await call("/garden/" + changed.slug, "GET", null, cookie)).status,
    200,
  );
  assert.equal((await fetch(base + "/garden/" + changed.slug)).status, 404);
  r = await call(
    "/api/pages/" + p.id,
    "PATCH",
    { visibility: "public", version: p.version },
    cookie,
  );
  assert.equal(r.status, 200);
  assert.equal((await fetch(base + "/garden/" + p.slug)).status, 404);
  assert.equal((await fetch(base + "/garden/" + changed.slug)).status, 200);
  const stable = await fetch(base + "/p/" + p.id, { redirect: "manual" });
  assert.equal(stable.status, 307);
  assert.equal(stable.headers.get("location"), "/garden/" + changed.slug);
  assert.equal(
    (
      await call(
        "/api/pages/" + p.id + "/address",
        "PATCH",
        { slug: "bad address", expectedSlug: changed.slug },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/api/pages/" + p.id + "/address",
        "PATCH",
        { slug: "another", expectedSlug: p.slug },
        cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await call("/api/pages/" + p.id + "/address", "PATCH", {
        slug: "another",
        expectedSlug: changed.slug,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        "/api/pages/" + p.id + "/address",
        "PATCH",
        { slug: "another", expectedSlug: changed.slug },
        cookie,
        "https://other.example",
      )
    ).status,
    403,
  );
});
test("nested navigation preserves order, validates destinations and cycles, filters private targets, and guards writes", async () => {
  const cookie = await login();
  const publicPage = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Menu public " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  await call(
    "/api/pages/" + publicPage.id,
    "PATCH",
    { visibility: "public", version: publicPage.version },
    cookie,
  );
  const privatePage = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Menu private " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const first = await (
    await call("/api/navigation", "GET", null, cookie)
  ).json();
  const root = crypto.randomUUID(),
    child = crypto.randomUUID(),
    hidden = crypto.randomUUID();
  const items = [
    {
      id: root,
      label: "Stories",
      parentId: null,
      destination: { kind: "page", pageId: publicPage.id },
    },
    {
      id: child,
      label: "Elsewhere",
      parentId: root,
      destination: { kind: "external", url: "https://example.com/garden" },
    },
    {
      id: hidden,
      label: "Our private garden",
      parentId: null,
      destination: { kind: "page", pageId: privatePage.id },
    },
  ];
  let r = await call(
    "/api/navigation",
    "PUT",
    { items, version: first.version },
    cookie,
  );
  assert.equal(r.status, 200);
  const saved = await r.json();
  const pub = await (await call("/api/navigation", "GET")).json();
  assert.deepEqual(
    pub.items.map((x) => x.label),
    ["Stories", "Elsewhere"],
  );
  assert.equal(pub.items[0].href, "/garden/" + publicPage.slug);
  assert.equal(pub.items[1].parentId, root);
  const invalid = structuredClone(items);
  invalid[0].parentId = child;
  assert.equal(
    (
      await call(
        "/api/navigation",
        "PUT",
        { items: invalid, version: saved.version },
        cookie,
      )
    ).status,
    400,
  );
  invalid[0].parentId = null;
  invalid[1].destination.url = "javascript:alert(1)";
  assert.equal(
    (
      await call(
        "/api/navigation",
        "PUT",
        { items: invalid, version: saved.version },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/api/navigation",
        "PUT",
        { items, version: first.version },
        cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (await call("/api/navigation", "PUT", { items, version: saved.version }))
      .status,
    401,
  );
  assert.equal(
    (
      await call(
        "/api/navigation",
        "PUT",
        { items, version: saved.version },
        cookie,
        "https://other.example",
      )
    ).status,
    403,
  );
  const reordered = [{ ...items[1], parentId: null }, items[0]];
  r = await call(
    "/api/navigation",
    "PUT",
    { items: reordered, version: saved.version },
    cookie,
  );
  assert.equal(r.status, 200);
  assert.deepEqual(
    (await (await call("/api/navigation", "GET")).json()).items.map(
      (x) => x.label,
    ),
    ["Elsewhere", "Stories"],
  );
});
test("text and button links store page IDs and remain visible when their private target becomes not found", async () => {
  const cookie = await login();
  const target = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Linked target " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const source = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Linked source " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const destination = { kind: "page", pageId: target.id };
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Text",
        props: {
          id: "linked-text",
          style: "p",
          text: "Visit our quiet rosemary today.",
          linkText: "quiet rosemary",
          destination,
        },
      },
      {
        type: "Button",
        props: { id: "linked-button", label: "Our secret garden", destination },
      },
    ],
  };
  let r = await call(
    "/api/pages/" + source.id,
    "PATCH",
    {
      title: source.title,
      content,
      version: source.version,
      visibility: "public",
    },
    cookie,
  );
  assert.equal(r.status, 200);
  let html = await (await fetch(base + "/garden/" + source.slug)).text();
  assert.match(html, /href="\/p\/[^"]+">quiet rosemary<\/a>/);
  assert.match(html, /href="\/p\/[^"]+">Our secret garden<\/a>/);
  assert.equal((await fetch(base + "/p/" + target.id)).status, 404);
  r = await call(
    "/api/pages/" + target.id,
    "PATCH",
    { visibility: "public", version: target.version },
    cookie,
  );
  assert.equal(r.status, 200);
  r = await call(
    "/api/pages/" + target.id + "/address",
    "PATCH",
    { slug: "linked-" + target.id, expectedSlug: target.slug },
    cookie,
  );
  assert.equal(r.status, 200);
  const linked = await fetch(base + "/p/" + target.id);
  assert.equal(linked.status, 200);
  assert.equal(linked.url, base + "/garden/linked-" + target.id);
  const missing = structuredClone(content);
  missing.content[0].props.destination = {
    kind: "page",
    pageId: crypto.randomUUID(),
  };
  const before = await (
    await call("/api/pages/" + source.id, "GET", null, cookie)
  ).json();
  assert.equal(
    (
      await call(
        "/api/pages/" + source.id,
        "PATCH",
        { title: source.title, content: missing, version: before.version },
        cookie,
      )
    ).status,
    400,
  );
  const bad = structuredClone(content);
  bad.content[0].props.destination = {
    kind: "external",
    url: "javascript:alert(1)",
  };
  const saved = await (
    await call("/api/pages/" + source.id, "GET", null, cookie)
  ).json();
  assert.equal(
    (
      await call(
        "/api/pages/" + source.id,
        "PATCH",
        { title: source.title, content: bad, version: saved.version },
        cookie,
      )
    ).status,
    400,
  );
});
import postgres from "postgres";
test("public navigation follows privacy and trash transitions without leaking hidden children", async () => {
  const cookie = await login();
  let p = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Menu transition " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  p = await (
    await call(
      "/api/pages/" + p.id,
      "PATCH",
      { visibility: "public", version: p.version },
      cookie,
    )
  ).json();
  const current = await (
    await call("/api/navigation", "GET", null, cookie)
  ).json();
  const root = crypto.randomUUID();
  const items = [
    {
      id: root,
      label: "Available story",
      parentId: null,
      destination: { kind: "page", pageId: p.id },
    },
    {
      id: crypto.randomUUID(),
      label: "Nested external story",
      parentId: root,
      destination: { kind: "external", url: "https://example.com" },
    },
  ];
  const menu = await (
    await call(
      "/api/navigation",
      "PUT",
      { items, version: current.version },
      cookie,
    )
  ).json();
  assert.equal(
    (await (await call("/api/navigation", "GET")).json()).items.length,
    2,
  );
  p = await (
    await call(
      "/api/pages/" + p.id,
      "PATCH",
      { visibility: "private", version: p.version },
      cookie,
    )
  ).json();
  assert.deepEqual(
    (await (await call("/api/navigation", "GET")).json()).items,
    [],
  );
  await call(
    "/api/pages/" + p.id,
    "PATCH",
    { visibility: "public", version: p.version },
    cookie,
  );
  assert.ok(
    (await (await fetch(base + "/login")).text()).includes("Available story"),
  );
  p = await (await call("/api/pages/" + p.id, "GET", null, cookie)).json();
  p = await (
    await call(
      "/api/pages/" + p.id,
      "PATCH",
      { visibility: "private", version: p.version },
      cookie,
    )
  ).json();
  assert.ok(
    !(await (await fetch(base + "/login")).text()).includes("Available story"),
  );
  assert.ok(
    !(await (await fetch(base + "/missing-garden-path")).text()).includes(
      "Available story",
    ),
  );
  await call(
    "/api/pages/" + p.id,
    "PATCH",
    { visibility: "public", version: p.version },
    cookie,
  );
  // Fixture setup models trash before ticket 10 exposes its action. Assertions stay at HTTP boundaries.
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { ssl: false, max: 1 });
  try {
    await sql`update pages set deleted_at=now() where id=${p.id}`;
  } finally {
    await sql.end();
  }
  assert.deepEqual(
    (await (await call("/api/navigation", "GET")).json()).items,
    [],
  );
  assert.equal((await fetch(base + "/garden/" + p.slug)).status, 404);
  assert.equal((await call("/p/" + p.id, "GET", null, cookie)).status, 404);
  const adjusted = [
    ...items,
    {
      id: crypto.randomUUID(),
      label: "A new external path",
      parentId: null,
      destination: { kind: "external", url: "https://example.com/new" },
    },
  ];
  assert.equal(
    (
      await call(
        "/api/navigation",
        "PUT",
        { items: adjusted, version: menu.version },
        cookie,
      )
    ).status,
    200,
  );
});
