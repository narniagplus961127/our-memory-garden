import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
async function login(prefix = "ADMIN") {
  const r = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env["TEST_" + prefix + "_EMAIL"],
      password: process.env["TEST_" + prefix + "_PASSWORD"],
    }),
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
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
async function create(cookie, title = "History garden") {
  return (await call("/api/pages", "POST", { title }, cookie)).json();
}
test("trusted history restores content while preserving current visibility/address and displaced revision", async () => {
  const cookie = await login();
  let p = await create(cookie);
  const path = "/api/pages/" + p.id;
  const original = p.version;
  p = await (
    await call(
      path,
      "PATCH",
      {
        version: p.version,
        title: "New title",
        text: "Current memory",
        visibility: "public",
      },
      cookie,
    )
  ).json();
  const displaced = p.version;
  let r = await call(path + "/history", "GET", null, cookie);
  assert.equal(r.status, 200);
  const history = await r.json();
  assert.ok(
    history.groups.some((g) => g.versions.some((v) => v.version === original)),
  );
  r = await call(path + "/history/" + original, "GET", null, cookie);
  assert.equal((await r.json()).snapshot.title, "History garden");
  r = await call(
    path + "/history/" + original,
    "POST",
    { version: p.version, confirm: true, snapshot: { title: "Injected" } },
    cookie,
  );
  assert.equal(r.status, 200);
  const restored = await r.json();
  assert.equal(restored.title, "History garden");
  assert.equal(restored.visibility, "public");
  assert.equal(restored.slug, p.slug);
  assert.equal(
    (
      await (
        await call(path + "/history/" + displaced, "GET", null, cookie)
      ).json()
    ).snapshot.title,
    "New title",
  );
  assert.equal(
    (
      await call(
        path + "/history/" + original,
        "POST",
        { version: p.version, confirm: true },
        cookie,
      )
    ).status,
    409,
  );
  for (const endpoint of [
    path + "/history",
    path + "/history/" + original,
    "/api/trash",
  ])
    assert.equal((await call(endpoint)).status, 401);
});
test("trash warns about inbound links, restores private with stable identity and requires separate permanent deletion", async () => {
  const cookie = await login();
  let target = await create(cookie, "Trash target");
  const source = await create(cookie, "Inbound source");
  const path = "/api/pages/" + target.id;
  await call(
    "/api/pages/" + source.id,
    "PATCH",
    {
      version: source.version,
      content: {
        root: { props: {} },
        content: [
          {
            type: "Button",
            props: {
              id: "button",
              label: "Visit",
              destination: { kind: "page", pageId: target.id },
              variant: "primary",
              align: "left",
            },
          },
        ],
      },
    },
    cookie,
  );
  const refs = await (await call(path + "/trash", "GET", null, cookie)).json();
  assert.ok(refs.references.some((r) => r.id === source.id));
  assert.equal(
    (
      await call(
        path + "/trash",
        "POST",
        { action: "delete", confirm: true, version: target.version },
        cookie,
      )
    ).status,
    409,
  );
  target = await (
    await call(
      path + "/trash",
      "POST",
      { action: "trash", confirm: true, version: target.version },
      cookie,
    )
  ).json();
  assert.ok(target.deleted_at);
  assert.equal((await call(path, "GET", null, cookie)).status, 404);
  assert.ok(
    (await (await call("/api/trash", "GET", null, cookie)).json()).some(
      (p) => p.id === target.id,
    ),
  );
  target = await (
    await call(
      path + "/trash",
      "POST",
      { action: "restore", confirm: true, version: target.version },
      cookie,
    )
  ).json();
  assert.equal(target.visibility, "private");
  assert.equal((await call("/p/" + target.id)).status, 404);
  target = await (
    await call(
      path + "/trash",
      "POST",
      { action: "trash", confirm: true, version: target.version },
      cookie,
    )
  ).json();
  assert.equal(
    (
      await call(
        path + "/trash",
        "POST",
        { action: "delete", version: target.version },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        path + "/trash",
        "POST",
        { action: "delete", confirm: true, version: target.version },
        cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call(path + "/history", "GET", null, cookie)).status,
    404,
  );
  assert.equal(
    (await call("/api/pages/" + source.id, "GET", null, cookie)).status,
    200,
  );
});
test("nearby edits group without discarding revisions, actor boundaries split groups and concurrent restore has one winner", async () => {
  const owner = await login(),
    other = await login("OTHER");
  let p = await create(owner);
  const path = "/api/pages/" + p.id;
  for (const text of ["First saved", "Second saved", "Third saved"])
    p = await (
      await call(
        path,
        "PATCH",
        { version: p.version, text, editorSessionId: "history-group" },
        owner,
      )
    ).json();
  let history = await (
    await call(path + "/history", "GET", null, owner)
  ).json();
  assert.ok(history.groups.some((g) => g.versions.length === 2));
  const preserved = p.version;
  p = await (
    await call(
      path,
      "PATCH",
      {
        version: p.version,
        text: "Other gardener",
        editorSessionId: "history-group",
      },
      other,
    )
  ).json();
  const race = await Promise.all([
    call(
      path + "/history/1",
      "POST",
      { version: p.version, confirm: true },
      owner,
    ),
    call(
      path + "/history/2",
      "POST",
      { version: p.version, confirm: true },
      other,
    ),
  ]);
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  history = await (await call(path + "/history", "GET", null, owner)).json();
  assert.ok(
    history.groups.some((g) => g.versions.some((v) => v.version === preserved)),
  );
  assert.ok(
    (
      await (
        await call(path + "/history/" + p.version, "GET", null, owner)
      ).json()
    ).snapshot.content.content.some((b) => b.props.text === "Other gardener"),
  );
});
test("current homepage cannot be trashed and history restore retains public homepage identity", async () => {
  const owner = await login();
  let p = await create(owner, "Homepage history");
  const path = "/api/pages/" + p.id;
  p = await (
    await call(
      path,
      "PATCH",
      { version: p.version, visibility: "public", text: "Entrance" },
      owner,
    )
  ).json();
  assert.equal(
    (await call("/api/homepage", "PATCH", { id: p.id }, owner)).status,
    200,
  );
  assert.equal(
    (
      await call(
        path + "/trash",
        "POST",
        { action: "trash", confirm: true, version: p.version },
        owner,
      )
    ).status,
    409,
  );
  const r = await call(
    path + "/history/1",
    "POST",
    { version: p.version, confirm: true },
    owner,
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).visibility, "public");
  assert.equal((await (await call("/api/homepage")).json()).id, p.id);
});
test("outsider sessions and cross-origin requests cannot read or mutate recovery data", async () => {
  const { betterAuth } = await import("better-auth");
  const { localAuthOptions } =
    await import("../../src/lib/server/local-auth.ts");
  const options = localAuthOptions();
  try {
    const response = await betterAuth(options).api.signInEmail({
      body: {
        email: process.env.TEST_OUTSIDER_EMAIL,
        password: process.env.TEST_OUTSIDER_PASSWORD,
      },
      asResponse: true,
    });
    assert.equal(response.status, 200);
    const outsider = response.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    const owner = await login();
    let p = await create(owner);
    const path = "/api/pages/" + p.id;
    p = await (
      await call(
        path,
        "PATCH",
        { version: p.version, text: "Private historical text" },
        owner,
      )
    ).json();
    for (const endpoint of [
      "/api/trash",
      path + "/history",
      path + "/history/1",
      path + "/trash",
    ])
      assert.equal((await call(endpoint, "GET", null, outsider)).status, 401);
    for (const endpoint of [path + "/history/1", path + "/trash"]) {
      assert.equal(
        (
          await call(
            endpoint,
            "POST",
            { version: p.version, action: "trash", confirm: true },
            outsider,
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await fetch(base + endpoint, {
            method: "POST",
            headers: {
              Origin: "https://example.net",
              Cookie: owner,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              version: p.version,
              action: "trash",
              confirm: true,
            }),
          })
        ).status,
        403,
      );
    }
  } finally {
    await options.database.end();
  }
});
test("trusted historical links can be restored after their target was permanently deleted", async () => {
  const owner = await login();
  let source = await create(owner, "Former link source"),
    target = await create(owner, "Former target");
  const path = "/api/pages/" + source.id;
  source = await (
    await call(
      path,
      "PATCH",
      {
        version: source.version,
        content: {
          root: { props: {} },
          content: [
            {
              type: "Button",
              props: {
                id: "old-link",
                label: "Former destination",
                destination: { kind: "page", pageId: target.id },
              },
            },
          ],
        },
      },
      owner,
    )
  ).json();
  const linkedRevision = source.version;
  source = await (
    await call(
      path,
      "PATCH",
      { version: source.version, text: "Link removed" },
      owner,
    )
  ).json();
  target = await (
    await call(
      "/api/pages/" + target.id + "/trash",
      "POST",
      { action: "trash", confirm: true, version: target.version },
      owner,
    )
  ).json();
  assert.equal(
    (
      await call(
        "/api/pages/" + target.id + "/trash",
        "POST",
        { action: "delete", confirm: true, version: target.version },
        owner,
      )
    ).status,
    200,
  );
  const r = await call(
    path + "/history/" + linkedRevision,
    "POST",
    { version: source.version, confirm: true },
    owner,
  );
  assert.equal(r.status, 200);
  assert.equal(
    (await r.json()).content.content[0].props.destination.pageId,
    target.id,
  );
  assert.equal((await call("/p/" + target.id)).status, 404);
});
test("restoration recovers date/category and invalidates an open details editor", async () => {
  const owner = await login();
  let p = await create(owner, "Metadata restoration");
  const path = "/api/pages/" + p.id;
  const cat = await (
    await call(
      "/api/categories",
      "POST",
      { name: "History category " + crypto.randomUUID() },
      owner,
    )
  ).json();
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        date: "2024-05-20",
        categoryId: cat.id,
        coverPhotoId: null,
        metadataVersion: p.metadata_version,
      },
      owner,
    )
  ).json();
  const chosen = p.version;
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        date: "2025-07-21",
        categoryId: null,
        coverPhotoId: null,
        metadataVersion: p.metadata_version,
      },
      owner,
    )
  ).json();
  const openVersion = p.metadata_version;
  const r = await call(
    path + "/history/" + chosen,
    "POST",
    { version: p.version, confirm: true },
    owner,
  );
  assert.equal(r.status, 200);
  const restored = await r.json();
  assert.equal(restored.page_date, "2024-05-20");
  assert.equal(restored.category_id, cat.id);
  assert.equal(restored.metadata_version, openVersion + 1);
  assert.equal(
    (
      await call(
        path + "/details",
        "PATCH",
        {
          date: null,
          categoryId: null,
          coverPhotoId: null,
          metadataVersion: openVersion,
        },
        owner,
      )
    ).status,
    409,
  );
});
test("uploaded photo content and cover restore with protected originals through trash and private restoration", async () => {
  const owner = await login();
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 64, height: 48, channels: 3, background: "#769270" },
  })
    .jpeg()
    .toBuffer();
  const start = await call(
    "/api/media/uploads",
    "POST",
    { name: "history-photo.jpg", size: bytes.length, type: "image/jpeg" },
    owner,
  );
  assert.equal(start.status, 201);
  const upload = await start.json();
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
    (await call("/api/media/" + upload.id + "/complete", "POST", {}, owner))
      .status,
    200,
  );
  let p = await create(owner, "Photo history");
  const path = "/api/pages/" + p.id;
  p = await (
    await call(
      path,
      "PATCH",
      {
        version: p.version,
        content: {
          root: { props: {} },
          content: [
            {
              type: "Image",
              props: {
                id: "retained-image",
                photoId: upload.id,
                alt: "A retained memory",
              },
            },
          ],
        },
      },
      owner,
    )
  ).json();
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        date: "2024-05-20",
        categoryId: null,
        coverPhotoId: upload.id,
        metadataVersion: p.metadata_version,
      },
      owner,
    )
  ).json();
  const chosen = p.version;
  p = await (
    await call(
      path,
      "PATCH",
      { version: p.version, text: "Photo removed from current content" },
      owner,
    )
  ).json();
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        date: null,
        categoryId: null,
        coverPhotoId: null,
        metadataVersion: p.metadata_version,
      },
      owner,
    )
  ).json();
  assert.equal(
    (await call("/api/media/" + upload.id + "/display")).status,
    404,
  );
  const restored = await call(
    path + "/history/" + chosen,
    "POST",
    { version: p.version, confirm: true },
    owner,
  );
  assert.equal(restored.status, 200);
  p = await restored.json();
  assert.equal(p.cover_photo_id, upload.id);
  assert.equal(p.content.content[0].props.photoId, upload.id);
  assert.deepEqual(
    Buffer.from(
      await (
        await call("/api/media/" + upload.id + "/original", "GET", null, owner)
      ).arrayBuffer(),
    ),
    bytes,
  );
  assert.equal(
    (await call("/api/media/" + upload.id + "/original")).status,
    404,
  );
  p = await (
    await call(
      path,
      "PATCH",
      { version: p.version, visibility: "public" },
      owner,
    )
  ).json();
  assert.equal(
    (await call("/api/media/" + upload.id + "/display")).status,
    200,
  );
  p = await (
    await call(
      path + "/trash",
      "POST",
      { action: "trash", version: p.version, confirm: true },
      owner,
    )
  ).json();
  assert.equal(
    (await call("/api/media/" + upload.id + "/display")).status,
    404,
  );
  p = await (
    await call(
      path + "/trash",
      "POST",
      { action: "restore", version: p.version, confirm: true },
      owner,
    )
  ).json();
  assert.equal(p.visibility, "private");
  assert.equal(p.cover_photo_id, upload.id);
  assert.equal(
    (await call("/api/media/" + upload.id + "/display")).status,
    404,
  );
  assert.deepEqual(
    Buffer.from(
      await (
        await call("/api/media/" + upload.id + "/original", "GET", null, owner)
      ).arrayBuffer(),
    ),
    bytes,
  );
});
test("inbound warnings include nested text, button, manual/category grids and menu references", async () => {
  const owner = await login();
  let target = await create(owner, "Inbound target");
  const source = await create(owner, "Nested inbound page");
  const category = await (
    await call(
      "/api/categories",
      "POST",
      { name: "Inbound category " + crypto.randomUUID() },
      owner,
    )
  ).json();
  target = await (
    await call(
      "/api/pages/" + target.id + "/details",
      "PATCH",
      {
        date: null,
        categoryId: category.id,
        coverPhotoId: null,
        metadataVersion: target.metadata_version,
      },
      owner,
    )
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "inbound-section",
          background: "paper",
          spacing: "comfortable",
          content: [
            {
              type: "Text",
              props: {
                id: "inbound-text",
                text: "Our garden destination",
                linkText: "destination",
                style: "p",
                destination: { kind: "page", pageId: target.id },
              },
            },
            {
              type: "Button",
              props: {
                id: "inbound-button",
                label: "Visit",
                destination: { kind: "page", pageId: target.id },
              },
            },
            {
              type: "PageGrid",
              props: {
                id: "inbound-manual",
                selection: {
                  mode: "manual",
                  pageIds: [target.id],
                  categoryId: "",
                },
              },
            },
            {
              type: "PageGrid",
              props: {
                id: "inbound-category",
                selection: {
                  mode: "category",
                  pageIds: [],
                  categoryId: category.id,
                },
              },
            },
          ],
        },
      },
    ],
  };
  assert.equal(
    (
      await call(
        "/api/pages/" + source.id,
        "PATCH",
        { version: source.version, content },
        owner,
      )
    ).status,
    200,
  );
  const menu = await (await call("/api/navigation", "GET", null, owner)).json();
  const menuItem = {
    id: crypto.randomUUID(),
    label: "Inbound menu target",
    parentId: null,
    destination: { kind: "page", pageId: target.id },
  };
  const updatedMenu = await call(
    "/api/navigation",
    "PUT",
    { version: menu.version, items: [...menu.items, menuItem] },
    owner,
  );
  assert.equal(updatedMenu.status, 200);
  try {
    const { references } = await (
      await call("/api/pages/" + target.id + "/trash", "GET", null, owner)
    ).json();
    assert.equal(
      references.filter(
        (r) => r.kind === "Text or button link" && r.id === source.id,
      ).length,
      2,
    );
    assert.ok(
      references.some(
        (r) => r.kind === "Manual page grid" && r.id === source.id,
      ),
    );
    assert.ok(
      references.some(
        (r) => r.kind === "Category page grid" && r.id === source.id,
      ),
    );
    assert.ok(
      references.some(
        (r) => r.kind === "Menu link" && r.title === "Inbound menu target",
      ),
    );
  } finally {
    const latest = await (
      await call("/api/navigation", "GET", null, owner)
    ).json();
    await call(
      "/api/navigation",
      "PUT",
      {
        version: latest.version,
        items: latest.items.filter((i) => i.id !== menuItem.id),
      },
      owner,
    );
  }
});
test("trusted sharing restoration recovers overrides, false indexing and cover, while explicit null values clear them", async () => {
  const owner = await login();
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#769270" },
  })
    .jpeg()
    .toBuffer();
  const upload = await (
    await call(
      "/api/media/uploads",
      "POST",
      { name: "sharing-history.jpg", size: bytes.length, type: "image/jpeg" },
      owner,
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
    (await call("/api/media/" + upload.id + "/complete", "POST", {}, owner))
      .status,
    200,
  );
  let p = await create(owner, "Sharing recovery");
  const path = "/api/pages/" + p.id;
  const original = p.version;
  const details = { date: null, categoryId: null, coverPhotoId: null };
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        ...details,
        metadataVersion: p.metadata_version,
        sharingTitle: "Earlier sharing title",
        sharingDescription: "Earlier sharing description",
        sharingCoverPhotoId: upload.id,
        allowIndexing: false,
      },
      owner,
    )
  ).json();
  const chosen = p.version;
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        ...details,
        metadataVersion: p.metadata_version,
        sharingTitle: "Current sharing title",
        sharingDescription: "Current sharing description",
        sharingCoverPhotoId: null,
        allowIndexing: true,
      },
      owner,
    )
  ).json();
  const epoch = p.metadata_version;
  const r = await call(
    path + "/history/" + chosen,
    "POST",
    { version: p.version, confirm: true },
    owner,
  );
  assert.equal(r.status, 200);
  p = await r.json();
  assert.equal(p.sharing_title, "Earlier sharing title");
  assert.equal(p.sharing_description, "Earlier sharing description");
  assert.equal(p.sharing_cover_photo_id, upload.id);
  assert.equal(p.allow_indexing, false);
  assert.equal(p.metadata_version, epoch + 1);
  assert.equal(p.visibility, "private");
  assert.equal(
    (await call("/api/media/" + upload.id + "/display")).status,
    404,
  );
  p = await (
    await call(
      path,
      "PATCH",
      { version: p.version, visibility: "public" },
      owner,
    )
  ).json();
  assert.equal(
    (await call("/api/media/" + upload.id + "/display")).status,
    200,
  );
  let html = await (
    await fetch(base + "/garden/" + p.slug, {
      headers: { "User-Agent": "Twitterbot" },
    })
  ).text();
  assert.ok(
    html.includes('property="og:title" content="Earlier sharing title"'),
  );
  assert.ok(html.includes('name="robots" content="noindex, follow"'));
  p = await (
    await call(
      path + "/history/" + original,
      "POST",
      { version: p.version, confirm: true },
      owner,
    )
  ).json();
  assert.equal(p.sharing_title, null);
  assert.equal(p.sharing_description, null);
  assert.equal(p.sharing_cover_photo_id, null);
  assert.equal(p.allow_indexing, true);
  assert.equal(p.visibility, "public");
  assert.equal(
    (await call("/api/media/" + upload.id + "/display")).status,
    404,
  );
});
test("pre-sharing snapshots preserve every current sharing setting without resetting the metadata counter", async () => {
  const owner = await login();
  let fixture;
  try {
    fixture = JSON.parse(
      await (
        await import("node:fs/promises")
      ).readFile("work/legacy-recovery.json", "utf8"),
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    let p = await create(owner, "Legacy sharing fixture");
    const revision = p.version;
    p = await (
      await call(
        "/api/pages/" + p.id,
        "PATCH",
        { version: p.version, text: "Legacy fixture" },
        owner,
      )
    ).json();
    const url = new URL(process.env.DATABASE_URL);
    assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
    const sql = (await import("postgres")).default(url.href, {
      max: 1,
      ssl: false,
    });
    try {
      // Fixture preparation only: reproduce the exact pre-0012 row shape. All behavior is asserted through HTTP.
      await sql`update page_versions set snapshot=snapshot-array['sharing_title','sharing_description','sharing_cover_photo_id','allow_indexing'] where page_id=${p.id} and version=${revision}`;
    } finally {
      await sql.end();
    }
    fixture = { id: p.id, revision };
  }
  const path = "/api/pages/" + fixture.id;
  const old = await (
    await call(path + "/history/" + fixture.revision, "GET", null, owner)
  ).json();
  for (const key of [
    "sharing_title",
    "sharing_description",
    "sharing_cover_photo_id",
    "allow_indexing",
  ])
    assert.equal(Object.hasOwn(old.snapshot, key), false);
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 24, height: 16, channels: 3, background: "#769270" },
  })
    .jpeg()
    .toBuffer();
  const upload = await (
    await call(
      "/api/media/uploads",
      "POST",
      {
        name: "legacy-sharing-history.jpg",
        size: bytes.length,
        type: "image/jpeg",
      },
      owner,
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
    (await call("/api/media/" + upload.id + "/complete", "POST", {}, owner))
      .status,
    200,
  );
  let p = await (await call(path, "GET", null, owner)).json();
  p = await (
    await call(
      path + "/details",
      "PATCH",
      {
        date: null,
        categoryId: null,
        coverPhotoId: null,
        metadataVersion: p.metadata_version,
        sharingTitle: "Keep current sharing title",
        sharingDescription: "Keep current sharing description",
        sharingCoverPhotoId: upload.id,
        allowIndexing: false,
      },
      owner,
    )
  ).json();
  const epoch = p.metadata_version;
  const r = await call(
    path + "/history/" + fixture.revision,
    "POST",
    { version: p.version, confirm: true, snapshot: { allow_indexing: true } },
    owner,
  );
  assert.equal(r.status, 200);
  const restored = await r.json();
  assert.equal(restored.sharing_title, "Keep current sharing title");
  assert.equal(
    restored.sharing_description,
    "Keep current sharing description",
  );
  assert.equal(restored.sharing_cover_photo_id, upload.id);
  assert.equal(restored.allow_indexing, false);
  assert.equal(restored.metadata_version, epoch + 1);
  assert.equal(
    (
      await call(
        path + "/details",
        "PATCH",
        {
          date: null,
          categoryId: null,
          coverPhotoId: null,
          metadataVersion: epoch,
        },
        owner,
      )
    ).status,
    409,
  );
});
