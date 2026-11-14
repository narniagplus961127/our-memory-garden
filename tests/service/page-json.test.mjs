import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const origin = process.env.TEST_BASE_URL;

test("imports older JSON and another page’s content without replacing page settings", async () => {
  const headers = { Origin: origin, "Content-Type": "application/json" };
  async function request(path, method = "GET", body, clientHeaders = headers) {
    return fetch(origin + path, {
      method,
      headers: clientHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function json(response, status = 200) {
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data).slice(0, 400));
    return data;
  }
  const anonymous = { ...headers };
  const auth = await request("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  assert.equal(auth.status, 200);
  headers.Cookie = auth.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  const label = crypto.randomUUID().slice(0, 8);
  async function create(title, slug) {
    return json(await request("/api/pages", "POST", { title, slug }), 201);
  }
  const source = await create("A memory " + label, "memory-" + label);
  const target = await create("Destination " + label, "destination-" + label);
  const sourcePath = "/api/pages/" + source.id;
  const targetPath = "/api/pages/" + target.id;
  const filePath = sourcePath + "/json";
  const targetFile = targetPath + "/json";
  const image = await sharp({
    create: { width: 40, height: 30, channels: 3, background: "#a0a981" },
  })
    .png()
    .toBuffer();
  const upload = await json(
    await request("/api/media/uploads", "POST", {
      name: "Page JSON " + label + ".png",
      type: "image/png",
      size: image.length,
    }),
    201,
  );
  assert.equal(
    (
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: image,
      })
    ).status,
    200,
  );
  await json(
    await request("/api/media/" + upload.id + "/complete", "POST", {}),
  );

  const settings = await json(
    await request(sourcePath + "/details", "PATCH", {
      date: "2024-11-27",
      categoryId: null,
      coverPhotoId: upload.id,
      metadataVersion: source.metadata_version,
      sharingTitle: "A memory to share",
      allowIndexing: false,
    }),
  );
  const photo = {
    photoId: upload.id,
    alt: "A pressed flower",
    caption: "A day together",
  };
  const photos = Array.from({ length: 103 }, (_, index) => ({
    ...photo,
    caption: "Photo " + index,
  }));
  const document = {
    source: { pageId: source.id, version: 1 },
    format: "our-memory-garden/page",
    version: 1,
    page: {
      title: "An editable memory",
      date: "2025-01-01",
      showTitle: false,
      coverPhotoId: crypto.randomUUID(),
      sharingTitle: "Ignore this imported title",
      blocks: [
        {
          type: "Section",
          id: "section",
          blocks: [
            {
              type: "Text",
              id: "plain",
              settings: { style: "p" },
              text: "A handwritten line",
            },
            { type: "Text", id: "rich", html: "<h2>Our <em>garden</em></h2>" },
            {
              type: "PhotoGrid",
              id: "grid",
              settings: { maxColumns: 3 },
              photos,
            },
          ],
        },
      ],
    },
  };
  assert.equal(
    (await request(filePath, "GET", undefined, anonymous)).status,
    401,
  );
  assert.equal(
    (await request(filePath, "POST", { file: document }, anonymous)).status,
    401,
  );
  assert.equal(
    (
      await request(
        filePath,
        "POST",
        { file: document },
        { ...headers, Origin: "https://example.com" },
      )
    ).status,
    403,
  );
  const sourcesPath = targetFile + "?sources=1";
  assert.equal(
    (await request(sourcesPath, "GET", undefined, anonymous)).status,
    401,
  );
  const sources = await json(await request(sourcesPath));
  assert.ok(sources.some(({ id }) => id === source.id));
  assert.ok(sources.every(({ id }) => id !== target.id));
  await json(await request(filePath, "POST", { sourcePageId: source.id }), 400);
  await json(
    await request(filePath, "POST", {
      file: document,
      sourcePageId: target.id,
    }),
    400,
  );
  await json(
    await request(filePath, "POST", { file: { ...document, version: 7 } }),
    400,
  );
  const missing = structuredClone(document);
  const absent = crypto.randomUUID();
  missing.page.blocks[0].blocks[2].photos[3].photoId = absent;
  assert.match(
    (await json(await request(filePath, "POST", { file: missing }), 400)).error,
    new RegExp(absent),
  );
  const invalid = structuredClone(document);
  invalid.page.blocks[0].blocks[1].html = "<script>alert(1)</script>";
  await json(await request(filePath, "POST", { file: invalid }), 400);
  const review = await json(
    await request(filePath, "POST", { file: document }),
  );
  assert.equal(review.photos, 1);
  assert.equal(review.blocks, 4);
  assert.equal((await json(await request(sourcePath))).title, source.title);
  await json(
    await request(filePath, "POST", {
      file: document,
      confirm: true,
    }),
  );
  const response = await request(filePath);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("content-disposition"), /memory-.*\.json/);
  const bytes = await response.text();
  assert.match(bytes, /\n  "page": \{/);
  const exported = JSON.parse(bytes);
  assert.deepEqual(Object.keys(exported), ["format", "version", "page"]);
  assert.deepEqual(Object.keys(exported.page), ["blocks"]);
  assert.doesNotMatch(bytes, /created_by|gridRevision|gridId|visibility/);
  assert.deepEqual(exported.page.blocks[0].blocks[2].photos, photos);
  assert.equal(
    exported.page.blocks[0].blocks[1].html,
    "<h2>Our <em>garden</em></h2>",
  );
  const original = await json(await request(sourcePath));
  assert.equal(original.title, source.title);
  assert.equal(original.page_date, settings.page_date);
  assert.equal(original.cover_photo_id, settings.cover_photo_id);
  assert.equal(original.sharing_title, settings.sharing_title);
  assert.equal(original.allow_indexing, false);
  assert.deepEqual(original.content.root, source.content.root);
  assert.equal(original.metadata_version, settings.metadata_version);
  const gridId = (page) =>
    page.content.content[0].props.content[2].props.gridId;
  const cloneId = crypto.randomUUID();
  const cloneRequest = { list: "pages", sourceId: source.id, id: cloneId };
  const clonePath = "/api/admin-list-clone";
  assert.equal(
    (await request(clonePath, "POST", cloneRequest, anonymous)).status,
    401,
  );
  assert.deepEqual(
    await json(await request(clonePath, "POST", cloneRequest), 201),
    { id: cloneId },
  );
  assert.deepEqual(
    await json(await request(clonePath, "POST", cloneRequest), 201),
    { id: cloneId },
  );
  const copy = await json(await request("/api/pages/" + cloneId));
  assert.equal(copy.title, source.title + " (copy)");
  assert.equal(copy.slug, source.slug + "-copy");
  assert.equal(copy.visibility, "private");
  assert.equal(copy.is_homepage, false);
  assert.notEqual(gridId(copy), gridId(original));
  for (const field of [
    "page_date",
    "cover_photo_id",
    "sharing_title",
    "allow_indexing",
  ])
    assert.equal(copy[field], original[field]);
  assert.deepEqual(copy.content.root, original.content.root);
  assert.deepEqual(
    await json(await request(`/api/pages/${cloneId}/json`)),
    exported,
  );
  const nextCloneId = crypto.randomUUID();
  await json(
    await request(clonePath, "POST", { ...cloneRequest, id: nextCloneId }),
    201,
  );
  assert.equal(
    (await json(await request(`/api/pages/${nextCloneId}`))).slug,
    source.slug + "-copy-2",
  );

  const changed = structuredClone(exported);
  changed.source = { pageId: source.id, version: original.version };
  changed.page.title = "Edited outside the editor";
  changed.page.slug = "must-not-change";
  changed.page.blocks[0].blocks[0].text = "Updated in JSON";
  changed.page.blocks[0].blocks[2].photos.reverse();
  const updatedSinceExport = await json(
    await request(sourcePath, "PATCH", {
      version: original.version,
      title: "Edited after export",
    }),
  );
  await json(await request(filePath, "POST", { file: changed }));
  await json(
    await request(filePath, "POST", {
      file: changed,
      confirm: true,
    }),
  );
  const updated = await json(await request(sourcePath));
  assert.equal(updated.title, updatedSinceExport.title);
  assert.equal(updated.slug, source.slug);
  assert.equal(updated.visibility, "private");
  assert.deepEqual(
    await json(await request(`/api/pages/${cloneId}/json`)),
    exported,
  );
  assert.equal(
    updated.content.content[0].props.content[0].props.text,
    "Updated in JSON",
  );

  const targetReview = await json(
    await request(targetFile, "POST", { sourcePageId: source.id }),
  );
  assert.equal(targetReview.blocks, 4);
  assert.equal(targetReview.photos, 1);
  const afterReview = await json(
    await request(targetPath, "PATCH", {
      version: target.version,
      visibility: "public",
    }),
  );
  assert.equal(afterReview.visibility, "public");
  await json(
    await request(targetFile, "POST", {
      sourcePageId: source.id,
      confirm: true,
    }),
  );
  const imported = await json(await request(targetPath));
  assert.equal(imported.visibility, "public");
  assert.equal(imported.slug, target.slug);
  assert.equal(imported.title, target.title);
  assert.deepEqual(imported.content.root, target.content.root);
  assert.notEqual(gridId(imported), gridId(updated));
  assert.deepEqual(
    (await json(await request(targetFile))).page.blocks[0].blocks[2].photos,
    [...photos].reverse(),
  );
  const privateCopyId = crypto.randomUUID();
  await json(
    await request(clonePath, "POST", {
      ...cloneRequest,
      sourceId: target.id,
      id: privateCopyId,
    }),
    201,
  );
  assert.equal(
    (await json(await request(`/api/pages/${privateCopyId}`))).visibility,
    "private",
  );
  assert.equal(
    (await json(await request(sourcePath))).version,
    updated.version,
  );

  await json(
    await request(
      sourcePath + "/history/" + updatedSinceExport.version,
      "POST",
      {
        version: updated.version,
        confirm: true,
      },
    ),
  );
  const restored = await json(await request(filePath));
  assert.deepEqual(restored.page.blocks[0].blocks[2].photos, photos);
  const restoredPage = await json(await request(sourcePath));
  assert.equal(restoredPage.title, updatedSinceExport.title);
  assert.equal(restoredPage.page_date, "2024-11-27");
  await json(
    await request(targetFile, "POST", { file: restored, confirm: true }),
  );
  const fromFile = await json(await request(targetPath));
  assert.equal(fromFile.title, target.title);
  assert.equal(fromFile.visibility, "public");
  assert.deepEqual(
    (await json(await request(targetFile))).page.blocks[0].blocks[2].photos,
    photos,
  );
});
