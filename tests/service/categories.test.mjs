import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
async function login() {
  const r = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    }),
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
async function call(path, method = "GET", data, cookie = "", origin = base) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
async function create(cookie, name, slug) {
  const r = await call("/api/categories", "POST", { name, slug }, cookie);
  assert.equal(r.status, 201);
  return r.json();
}
async function page(cookie, title, category, visibility = "private") {
  let p = await (await call("/api/pages", "POST", { title }, cookie)).json();
  p = await (
    await call(
      "/api/pages/" + p.id + "/details",
      "PATCH",
      {
        date: null,
        categoryId: category.id,
        coverPhotoId: null,
        metadataVersion: 0,
      },
      cookie,
    )
  ).json();
  if (visibility === "public")
    p = await (
      await call(
        "/api/pages/" + p.id,
        "PATCH",
        { version: p.version, visibility },
        cookie,
      )
    ).json();
  return p;
}
test("category addresses, stable destinations and deletion preserve pages and private boundaries", async () => {
  const cookie = await login(),
    stamp = crypto.randomUUID();
  let category = await create(cookie, "Our Day " + stamp);
  assert.equal(category.slug, "our-day-" + stamp);
  const publicPage = await page(
      cookie,
      "Visible memory " + stamp,
      category,
      "public",
    ),
    privatePage = await page(cookie, "Private memory " + stamp, category),
    trashedPage = await page(
      cookie,
      "Trashed memory " + stamp,
      category,
      "public",
    );
  assert.equal(
    (
      await call(
        "/api/pages/" + trashedPage.id + "/trash",
        "POST",
        { action: "trash", version: trashedPage.version, confirm: true },
        cookie,
      )
    ).status,
    200,
  );
  const html = await (await fetch(base + "/category/" + category.slug)).text();
  assert.ok(html.includes(publicPage.title));
  assert.ok(!html.includes(privatePage.title));
  assert.ok(!html.includes(trashedPage.title));
  const source = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Category links " + stamp },
      cookie,
    )
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "section-categories",
          content: [
            {
              type: "Button",
              props: {
                id: "button-category",
                label: "Visit collection",
                destination: { kind: "category", categoryId: category.id },
              },
            },
            {
              type: "Text",
              props: {
                id: "text-category",
                text: "Browse collection",
                style: "p",
                textRich:
                  '<p><a href="/c/' +
                  category.id +
                  '">Browse collection</a></p>',
              },
            },
            {
              type: "Image",
              props: {
                id: "image-category",
                alt: "Placeholder",
                destination: { kind: "category", categoryId: category.id },
              },
            },
            {
              type: "PageGrid",
              props: {
                id: "category-grid",
                selection: {
                  mode: "category",
                  categoryId: category.id,
                  pageIds: [],
                },
              },
            },
          ],
        },
      },
    ],
  };
  let saved = await call(
    "/api/pages/" + source.id,
    "PATCH",
    { version: source.version, content, visibility: "public" },
    cookie,
  );
  assert.equal(saved.status, 200);
  let sourcePage = await saved.json();
  let navigation = await (
    await call("/api/navigation", "GET", undefined, cookie)
  ).json();
  const menu = {
    id: crypto.randomUUID(),
    label: "Category menu " + stamp,
    parentId: null,
    destination: { kind: "category", categoryId: category.id },
  };
  const put = await call(
    "/api/navigation",
    "PUT",
    { version: navigation.version, items: [...navigation.items, menu] },
    cookie,
  );
  assert.equal(put.status, 200);
  const old = category;
  const renamed = await call(
    "/api/categories/" + category.id,
    "PATCH",
    {
      name: category.name + " together",
      slug: "together-" + stamp,
      expectedName: category.name,
      expectedSlug: category.slug,
    },
    cookie,
  );
  assert.equal(renamed.status, 200);
  category = await renamed.json();
  assert.equal((await fetch(base + "/category/" + old.slug)).status, 404);
  const stable = await fetch(base + "/c/" + category.id, {
    redirect: "manual",
  });
  assert.equal(stable.status, 307);
  assert.equal(stable.headers.get("location"), "/category/" + category.slug);
  assert.ok(
    (await (await call("/api/navigation")).json()).items.some(
      (i) => i.id === menu.id && i.href === "/category/" + category.slug,
    ),
  );
  assert.equal(
    (
      await call(
        "/api/categories/" + category.id,
        "DELETE",
        { confirm: true, expectedName: old.name, expectedSlug: old.slug },
        cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await (
        await call("/api/pages/" + publicPage.id, "GET", undefined, cookie)
      ).json()
    ).category_id,
    category.id,
  );
  const deletion = {
    confirm: true,
    expectedName: category.name,
    expectedSlug: category.slug,
  };
  assert.equal(
    (await call("/api/categories/" + category.id, "DELETE", deletion, cookie))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/categories/" + category.id, "DELETE", deletion, cookie))
      .status,
    200,
  );
  assert.equal((await fetch(base + "/c/" + category.id)).status, 404);
  assert.equal((await fetch(base + "/category/" + category.slug)).status, 404);
  for (const p of [publicPage, privatePage]) {
    const remaining = await (
      await call("/api/pages/" + p.id, "GET", undefined, cookie)
    ).json();
    assert.equal(remaining.title, p.title);
    assert.equal(remaining.category_id, null);
    assert.ok(remaining.metadata_version > p.metadata_version);
  }
  assert.ok(
    (await (await call("/api/trash", "GET", undefined, cookie)).json()).some(
      (p) => p.id === trashedPage.id && p.category_id === null,
    ),
  );
  assert.ok(
    !(await (await call("/api/navigation")).json()).items.some(
      (i) => i.id === menu.id,
    ),
  );
  const unrelated = await call(
    "/api/pages/" + source.id,
    "PATCH",
    {
      version: sourcePage.version,
      title: "Kept after category removal",
      content: sourcePage.content,
    },
    cookie,
  );
  assert.equal(unrelated.status, 200);
  sourcePage = await unrelated.json();
  const rendered = await (
    await fetch(base + "/garden/" + sourcePage.slug)
  ).text();
  assert.ok(rendered.includes("Visit collection"));
  assert.ok(!rendered.includes(publicPage.title));
  const restore = await call(
    "/api/pages/" + publicPage.id + "/history/" + publicPage.version,
    "POST",
    {
      version: (
        await (
          await call("/api/pages/" + publicPage.id, "GET", undefined, cookie)
        ).json()
      ).version,
      confirm: true,
    },
    cookie,
  );
  assert.equal(restore.status, 409);
  const fresh = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Missing category destination" },
      cookie,
    )
  ).json();
  assert.equal(
    (
      await call(
        "/api/pages/" + fresh.id,
        "PATCH",
        { version: fresh.version, content },
        cookie,
      )
    ).status,
    400,
  );
});
test("category forms enforce authorization, unique addresses, stable create retries and edit/delete preconditions", async () => {
  const cookie = await login(),
    stamp = crypto.randomUUID(),
    id = crypto.randomUUID(),
    body = { id, name: "Retry category " + stamp, slug: "retry-" + stamp };
  for (const method of ["POST", "PATCH", "DELETE"]) {
    const path =
      method === "POST" ? "/api/categories" : "/api/categories/" + id;
    assert.equal((await call(path, method, body)).status, 401);
    assert.equal(
      (await call(path, method, body, cookie, "https://elsewhere.example"))
        .status,
      403,
    );
  }
  assert.equal((await call("/api/categories/" + id)).status, 401);
  assert.equal(
    (await call("/api/categories", "POST", body, cookie)).status,
    201,
  );
  assert.equal(
    (await call("/api/categories", "POST", body, cookie)).status,
    201,
  );
  const category = await (
    await call("/api/categories/" + id, "GET", undefined, cookie)
  ).json();
  assert.equal(
    (
      await call(
        "/api/categories",
        "POST",
        { name: body.name.toUpperCase(), slug: "another-" + stamp },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/api/categories",
        "POST",
        { name: "Other " + stamp, slug: body.slug },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/api/categories",
        "POST",
        { name: "Bad address", slug: "../admin" },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/api/categories/" + id,
        "DELETE",
        { expectedName: category.name, expectedSlug: category.slug },
        cookie,
      )
    ).status,
    400,
  );
  const racers = await Promise.all(
    [1, 2].map((n) =>
      call(
        "/api/categories",
        "POST",
        {
          name: "Concurrent " + n + " " + stamp,
          slug: "same-address-" + stamp,
        },
        cookie,
      ),
    ),
  );
  assert.deepEqual(racers.map((r) => r.status).sort(), [201, 400]);
  const rename = {
    name: "Renamed " + stamp,
    slug: category.slug,
    expectedName: category.name,
    expectedSlug: category.slug,
  };
  assert.equal(
    (await call("/api/categories/" + id, "PATCH", rename, cookie)).status,
    200,
  );
  assert.equal(
    (await call("/api/categories/" + id, "PATCH", rename, cookie)).status,
    200,
  );
  assert.equal(
    (
      await call(
        "/api/categories/" + id,
        "PATCH",
        { ...rename, name: "Stale overwrite" },
        cookie,
      )
    ).status,
    409,
  );
});
