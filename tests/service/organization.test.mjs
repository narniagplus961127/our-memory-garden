import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
test("metadata revisions preserve the trusted base for independent editor saves", async () => {
  const cookie = await login();
  const original = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Details and content " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const path = "/api/pages/" + original.id;
  const details = await call(
    path + "/details",
    "PATCH",
    {
      date: "2026-10-30",
      categoryId: null,
      coverPhotoId: null,
      metadataVersion: 0,
    },
    cookie,
  );
  assert.equal(details.status, 200);
  const response = await call(
    path,
    "PATCH",
    {
      title: original.title,
      version: original.version,
      content: {
        root: { props: {} },
        content: [
          {
            type: "Text",
            props: {
              id: "independent-block",
              text: "Content survives a metadata revision",
              style: "p",
            },
          },
        ],
      },
    },
    cookie,
  );
  assert.equal(response.status, 200);
  const current = await response.json();
  assert.equal(current.page_date, "2026-10-30");
  assert.equal(
    current.content.content[0].props.text,
    "Content survives a metadata revision",
  );
  assert.equal(current.version, original.version + 2);
  const later = await call(
    path + "/details",
    "PATCH",
    {
      date: "2026-10-29",
      categoryId: null,
      coverPhotoId: null,
      metadataVersion: current.metadata_version,
    },
    cookie,
  );
  assert.equal(later.status, 200);
  const final = await (await call(path, "GET", null, cookie)).json();
  assert.equal(final.page_date, "2026-10-29");
  assert.equal(
    final.content.content[0].props.text,
    "Content survives a metadata revision",
  );
});
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
    .map((x) => x.split(";")[0])
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
test("administrators organize pages independently of content and rename shared categories", async () => {
  const cookie = await login();
  const p = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Organization " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  let r = await call(
    "/api/categories",
    "POST",
    { name: "Dates " + crypto.randomUUID() },
    cookie,
  );
  assert.equal(r.status, 201);
  const category = await r.json();
  const path = "/api/pages/" + p.id + "/details";
  r = await call(
    path,
    "PATCH",
    {
      date: "2026-10-30",
      categoryId: category.id,
      coverPhotoId: null,
      metadataVersion: 0,
    },
    cookie,
  );
  assert.equal(r.status, 200);
  const saved = await r.json();
  assert.equal(saved.page_date, "2026-10-30");
  assert.equal(saved.category_id, category.id);
  assert.equal(saved.version, p.version + 1);
  r = await call(
    "/api/categories/" + category.id,
    "PATCH",
    { name: "Remembered " + category.id, expectedName: category.name },
    cookie,
  );
  assert.equal(r.status, 200);
  assert.equal(
    (await (await call("/api/categories", "GET", null, cookie)).json()).find(
      (c) => c.id === category.id,
    ).name,
    "Remembered " + category.id,
  );
  assert.equal(
    (
      await call(
        path,
        "PATCH",
        {
          date: null,
          categoryId: null,
          coverPhotoId: null,
          metadataVersion: 0,
        },
        cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await call(path, "PATCH", {
        date: null,
        categoryId: null,
        coverPhotoId: null,
        metadataVersion: 1,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        path,
        "PATCH",
        {
          date: null,
          categoryId: null,
          coverPhotoId: null,
          metadataVersion: 1,
        },
        cookie,
        "https://other.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        path,
        "PATCH",
        {
          date: "2026-02-30",
          categoryId: null,
          coverPhotoId: null,
          metadataVersion: 1,
        },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        path,
        "PATCH",
        {
          date: null,
          categoryId: null,
          coverPhotoId: crypto.randomUUID(),
          metadataVersion: 1,
        },
        cookie,
      )
    ).status,
    400,
  );
  r = await call(
    "/api/pages/" + p.id,
    "PATCH",
    { title: p.title, text: "Independent content", version: saved.version },
    cookie,
  );
  assert.equal(r.status, 200);
  const updated = await r.json();
  assert.equal(updated.page_date, "2026-10-30");
  assert.equal(updated.category_id, category.id);
});
test("manual and category grids filter private pages at the data and nested rendering boundaries", async () => {
  const cookie = await login();
  const label = crypto.randomUUID();
  const category = await (
    await call("/api/categories", "POST", { name: "Grid " + label }, cookie)
  ).json();
  const pages = [];
  for (const title of [
    "First public " + label,
    "Private secret " + label,
    "Second public " + label,
  ]) {
    let p = await (await call("/api/pages", "POST", { title }, cookie)).json();
    p = await (
      await call(
        "/api/pages/" + p.id + "/details",
        "PATCH",
        {
          date: "2026-10-30",
          categoryId: category.id,
          coverPhotoId: null,
          metadataVersion: 0,
        },
        cookie,
      )
    ).json();
    if (!title.startsWith("Private"))
      p = await (
        await call(
          "/api/pages/" + p.id,
          "PATCH",
          { version: p.version, visibility: "public" },
          cookie,
        )
      ).json();
    pages.push(p);
  }
  const selection = {
    mode: "manual",
    pageIds: [pages[2].id, pages[1].id, pages[0].id],
    categoryId: "",
  };
  const path =
    "/api/page-grid?selection=" + encodeURIComponent(JSON.stringify(selection));
  assert.deepEqual(
    (await (await call(path, "GET")).json()).map((p) => p.title),
    [pages[2].title, pages[0].title],
  );
  assert.deepEqual(
    (await (await call(path, "GET", null, cookie)).json()).map((p) => p.title),
    [pages[2].title, pages[1].title, pages[0].title],
  );
  const cp =
    "/api/page-grid?selection=" +
    encodeURIComponent(
      JSON.stringify({
        mode: "category",
        pageIds: [],
        categoryId: category.id,
      }),
    );
  assert.equal((await (await call(cp, "GET")).json()).length, 2);
  let source = await (
    await call("/api/pages", "POST", { title: "Grid source " + label }, cookie)
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "nested-grid-section",
          content: [
            {
              type: "PageGrid",
              props: { id: "nested-grid", selection, showDate: true },
            },
          ],
        },
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
  assert.ok(html.includes(pages[0].title));
  assert.ok(html.includes(pages[2].title));
  assert.ok(!html.includes(pages[1].title));
  const hidden = await (
    await call(
      "/api/pages/" + pages[0].id,
      "PATCH",
      { version: pages[0].version, visibility: "private" },
      cookie,
    )
  ).json();
  assert.equal(hidden.visibility, "private");
  assert.equal((await (await call(path, "GET")).json()).length, 1);
  html = await (await fetch(base + "/garden/" + source.slug)).text();
  assert.ok(!html.includes(pages[0].title));
});
test("cover-only use grants display access only while a live public page references it", async () => {
  const cookie = await login();
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 40, height: 30, channels: 3, background: "#769270" },
  })
    .jpeg()
    .toBuffer();
  let r = await call(
    "/api/media/uploads",
    "POST",
    {
      name: "Grid cover " + crypto.randomUUID() + ".jpg",
      size: bytes.length,
      type: "image/jpeg",
    },
    cookie,
  );
  assert.equal(r.status, 201);
  const upload = await r.json();
  assert.equal(
    (
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: bytes,
      })
    ).status,
    200,
  );
  r = await call("/api/media/" + upload.id + "/complete", "POST", {}, cookie);
  assert.equal(r.status, 200);
  let p = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Cover only " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  p = await (
    await call(
      "/api/pages/" + p.id + "/details",
      "PATCH",
      {
        date: null,
        categoryId: null,
        coverPhotoId: upload.id,
        metadataVersion: 0,
      },
      cookie,
    )
  ).json();
  assert.equal(
    (await fetch(base + "/api/media/" + upload.id + "/display")).status,
    404,
  );
  p = await (
    await call(
      "/api/pages/" + p.id,
      "PATCH",
      { visibility: "public", version: p.version },
      cookie,
    )
  ).json();
  assert.equal(
    (await fetch(base + "/api/media/" + upload.id + "/display")).status,
    200,
  );
  assert.equal(
    (await fetch(base + "/api/media/" + upload.id + "/original")).status,
    404,
  );
  const selection = { mode: "manual", pageIds: [p.id], categoryId: "" };
  assert.equal(
    (
      await (
        await fetch(
          base +
            "/api/page-grid?selection=" +
            encodeURIComponent(JSON.stringify(selection)),
        )
      ).json()
    )[0].cover_photo_id,
    upload.id,
  );
  p = await (
    await call(
      "/api/pages/" + p.id,
      "PATCH",
      { visibility: "private", version: p.version },
      cookie,
    )
  ).json();
  assert.equal(
    (await fetch(base + "/api/media/" + upload.id + "/display")).status,
    404,
  );
  p = await (
    await call(
      "/api/pages/" + p.id,
      "PATCH",
      { visibility: "public", version: p.version },
      cookie,
    )
  ).json();
  await call(
    "/api/pages/" + p.id + "/details",
    "PATCH",
    { date: null, categoryId: null, coverPhotoId: null, metadataVersion: 1 },
    cookie,
  );
  assert.equal(
    (await fetch(base + "/api/media/" + upload.id + "/display")).status,
    404,
  );
});
