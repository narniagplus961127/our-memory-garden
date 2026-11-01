import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
async function call(path, method = "GET", body, cookie = "") {
  return fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function login() {
  const r = await call("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((x) => x.split(";")[0])
    .join("; ");
}
test("sharing details emit current public metadata and indexing never grants access", async () => {
  const cookie = await login();
  let p = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Discovery " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const path = "/api/pages/" + p.id;
  let r = await call(
    path + "/details",
    "PATCH",
    {
      date: null,
      categoryId: null,
      coverPhotoId: null,
      metadataVersion: 0,
      sharingTitle: "A shared garden story",
      sharingDescription: "An evening among the trees.",
      sharingCoverPhotoId: null,
      allowIndexing: false,
    },
    cookie,
  );
  assert.equal(r.status, 200);
  p = await r.json();
  assert.equal(p.sharing_title, "A shared garden story");
  assert.equal(p.allow_indexing, false);
  r = await fetch(base + "/garden/" + p.slug);
  assert.equal(r.status, 404);
  assert.ok(!(await r.text()).includes("A shared garden story"));
  let html = await (
    await call("/garden/" + p.slug, "GET", undefined, cookie)
  ).text();
  assert.ok(!html.includes('property="og:title"'));
  assert.ok(!html.includes("A shared garden story"));
  p = await (
    await call(
      path,
      "PATCH",
      { version: p.version, visibility: "public" },
      cookie,
    )
  ).json();
  html = await (
    await fetch(base + "/garden/" + p.slug, {
      headers: { "User-Agent": "Twitterbot" },
    })
  ).text();
  assert.ok(
    html.includes('property="og:title" content="A shared garden story"'),
  );
  assert.ok(
    html.includes('name="description" content="An evening among the trees."'),
  );
  assert.ok(html.includes('name="robots" content="noindex, follow"'));
  assert.ok(
    html.includes('rel="canonical" href="' + base + "/garden/" + p.slug + '"'),
  );
  assert.ok(
    !(await (await fetch(base + "/sitemap.xml")).text()).includes(p.slug),
  );
  r = await call(
    path + "/details",
    "PATCH",
    {
      date: null,
      categoryId: null,
      coverPhotoId: null,
      metadataVersion: p.metadata_version,
      sharingTitle: null,
      sharingDescription: null,
      sharingCoverPhotoId: null,
      allowIndexing: true,
    },
    cookie,
  );
  assert.equal(r.status, 200);
  p = await r.json();
  html = await (
    await fetch(base + "/garden/" + p.slug, {
      headers: { "User-Agent": "Twitterbot" },
    })
  ).text();
  assert.ok(html.includes('property="og:title" content="' + p.title + '"'));
  assert.ok(
    (await (await fetch(base + "/sitemap.xml")).text()).includes(
      base + "/garden/" + p.slug,
    ),
  );
  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.ok(robots.includes("Disallow: /admin"));
  assert.ok(!robots.includes(p.slug));
  assert.ok(robots.includes(base + "/sitemap.xml"));
});
test("sharing-cover-only live public use grants display while historical copies never grant it", async () => {
  const cookie = await login();
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 40, height: 30, channels: 3, background: "#769270" },
  })
    .jpeg()
    .toBuffer();
  const upload = await (
    await call(
      "/api/media/uploads",
      "POST",
      {
        name: "Sharing cover " + crypto.randomUUID() + ".jpg",
        size: bytes.length,
        type: "image/jpeg",
      },
      cookie,
    )
  ).json();
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
  assert.equal(
    (await call("/api/media/" + upload.id + "/complete", "POST", {}, cookie))
      .status,
    200,
  );
  let p = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Cover discovery " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const path = "/api/pages/" + p.id;
  const details = {
    date: null,
    categoryId: null,
    coverPhotoId: null,
    sharingTitle: null,
    sharingDescription: null,
    sharingCoverPhotoId: upload.id,
    allowIndexing: true,
  };
  p = await (
    await call(
      path + "/details",
      "PATCH",
      { ...details, metadataVersion: 0 },
      cookie,
    )
  ).json();
  assert.equal(p.sharing_cover_photo_id, upload.id);
  const display = base + "/api/media/" + upload.id + "/display";
  assert.equal((await fetch(display)).status, 404);
  p = await (
    await call(
      path,
      "PATCH",
      { version: p.version, visibility: "public" },
      cookie,
    )
  ).json();
  assert.equal((await fetch(display)).status, 200);
  assert.equal(
    (await fetch(base + "/api/media/" + upload.id + "/original")).status,
    404,
  );
  let html = await (
    await fetch(base + "/garden/" + p.slug, {
      headers: { "User-Agent": "Twitterbot" },
    })
  ).text();
  assert.ok(html.includes('property="og:image" content="' + display + '"'));
  assert.ok(html.includes('name="twitter:image" content="' + display + '"'));
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        ...details,
        sharingCoverPhotoId: null,
        metadataVersion: p.metadata_version,
      },
      cookie,
    )
  ).json();
  assert.equal((await fetch(display)).status, 404);
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        ...details,
        coverPhotoId: upload.id,
        sharingCoverPhotoId: null,
        metadataVersion: p.metadata_version,
      },
      cookie,
    )
  ).json();
  html = await (
    await fetch(base + "/garden/" + p.slug, {
      headers: { "User-Agent": "Twitterbot" },
    })
  ).text();
  assert.ok(html.includes('property="og:image" content="' + display + '"'));
  assert.equal((await fetch(display)).status, 200);
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        ...details,
        sharingCoverPhotoId: null,
        metadataVersion: p.metadata_version,
      },
      cookie,
    )
  ).json();
  assert.equal((await fetch(display)).status, 404);
  // Old clients omitting new fields retain independent sharing edits.
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        ...details,
        sharingCoverPhotoId: upload.id,
        sharingTitle: "Keep this title",
        metadataVersion: p.metadata_version,
      },
      cookie,
    )
  ).json();
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        date: "2026-10-30",
        categoryId: null,
        coverPhotoId: null,
        metadataVersion: p.metadata_version,
      },
      cookie,
    )
  ).json();
  assert.equal(p.sharing_title, "Keep this title");
  assert.equal(p.sharing_cover_photo_id, upload.id);
  p = await (
    await call(
      path,
      "PATCH",
      { version: p.version, visibility: "private" },
      cookie,
    )
  ).json();
  assert.equal((await fetch(display)).status, 404);
  assert.ok(
    !(await (await fetch(base + "/sitemap.xml")).text()).includes(p.slug),
  );
  html = await (
    await fetch(base + "/garden/" + p.slug, {
      headers: { "User-Agent": "Twitterbot" },
    })
  ).text();
  assert.ok(!html.includes("Keep this title"));
  assert.ok(!html.includes(display));
  for (const patch of [
    { sharingTitle: "x".repeat(201) },
    { sharingDescription: "x".repeat(2001) },
    { sharingCoverPhotoId: crypto.randomUUID() },
    { allowIndexing: "true" },
  ])
    assert.equal(
      (
        await call(
          path + "/details",
          "PATCH",
          { ...details, ...patch, metadataVersion: p.metadata_version },
          cookie,
        )
      ).status,
      400,
    );
  assert.equal(
    (
      await call(path + "/details", "PATCH", {
        ...details,
        metadataVersion: p.metadata_version,
      })
    ).status,
    401,
  );
});

test("homepage uses one root canonical and address changes replace sitemap entries without exposing private addresses", async () => {
  const cookie = await login();
  const home = await (await call("/api/homepage")).json();
  assert.ok(home?.id);
  let html = await (
    await fetch(base + "/", { headers: { "User-Agent": "Twitterbot" } })
  ).text();
  assert.ok(html.includes('rel="canonical" href="' + base + '/"'));
  html = await (
    await fetch(base + "/garden/" + home.slug, {
      headers: { "User-Agent": "Twitterbot" },
    })
  ).text();
  assert.ok(html.includes('rel="canonical" href="' + base + '/"'));
  let sitemap = await (await fetch(base + "/sitemap.xml")).text();
  assert.ok(sitemap.includes("<loc>" + base + "/</loc>"));
  assert.ok(!sitemap.includes("/garden/" + home.slug));
  let p = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Address discovery " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  p = await (
    await call(
      "/api/pages/" + p.id,
      "PATCH",
      { version: p.version, visibility: "public" },
      cookie,
    )
  ).json();
  const old = p.slug;
  const r = await call(
    "/api/pages/" + p.id + "/address",
    "PATCH",
    { slug: "discovery-" + crypto.randomUUID(), expectedSlug: old },
    cookie,
  );
  assert.equal(r.status, 200);
  p = await r.json();
  assert.equal((await fetch(base + "/garden/" + old)).status, 404);
  const redirect = await fetch(base + "/p/" + p.id, { redirect: "manual" });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get("location"), "/garden/" + p.slug);
  sitemap = await (await fetch(base + "/sitemap.xml")).text();
  assert.ok(sitemap.includes("/garden/" + p.slug));
  assert.ok(!sitemap.includes(old));
});
test("trashed public pages disappear from discovery immediately", async () => {
  const cookie = await login();
  let p = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Trash discovery " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  p = await (
    await call(
      "/api/pages/" + p.id,
      "PATCH",
      { version: p.version, visibility: "public" },
      cookie,
    )
  ).json();
  assert.ok(
    (await (await fetch(base + "/sitemap.xml")).text()).includes(p.slug),
  );
  const connection = new URL(process.env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(connection.hostname));
  const sql = (await import("postgres")).default(connection.href, {
    max: 1,
    ssl: false,
  });
  try {
    await sql`update pages set deleted_at=now(),version=version+1 where id=${p.id}`;
  } finally {
    await sql.end();
  }
  assert.equal((await fetch(base + "/garden/" + p.slug)).status, 404);
  assert.equal((await fetch(base + "/p/" + p.id)).status, 404);
  assert.ok(
    !(await (await fetch(base + "/sitemap.xml")).text()).includes(p.slug),
  );
  assert.ok(
    !(await (await fetch(base + "/robots.txt")).text()).includes(p.slug),
  );
});
