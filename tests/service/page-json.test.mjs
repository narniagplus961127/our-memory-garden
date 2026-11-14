import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const origin = process.env.TEST_BASE_URL;

test("page JSON replaces content safely and independent copies retain all media", async () => {
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
    format: "our-memory-garden/page",
    version: 1,
    page: {
      title: "An editable memory",
      date: "2024-11-27",
      showTitle: false,
      coverPhotoId: upload.id,
      sharingTitle: "A memory to share",
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
  assert.equal(
    (await request("/api/pages/copy", "POST", {}, anonymous)).status,
    401,
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
      version: review.version,
    }),
  );
  const response = await request(filePath);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("content-disposition"), /memory-.*\.json/);
  const bytes = await response.text();
  assert.match(bytes, /\n  "page": \{/);
  const exported = JSON.parse(bytes);
  assert.doesNotMatch(bytes, /created_by|gridRevision|gridId|visibility/);
  assert.deepEqual(exported.page.blocks[0].blocks[2].photos, photos);
  assert.equal(
    exported.page.blocks[0].blocks[1].html,
    "<h2>Our <em>garden</em></h2>",
  );
  assert.equal(exported.page.date, "2024-11-27");

  const copyRequest = {
    title: "Independent copy",
    slug: "copy-" + label,
    sourceId: source.id,
    requestId: crypto.randomUUID(),
  };
  const copy = await json(
    await request("/api/pages/copy", "POST", copyRequest),
    201,
  );
  assert.deepEqual(
    await json(await request("/api/pages/copy", "POST", copyRequest), 201),
    copy,
  );
  await json(
    await request("/api/pages/copy", "POST", {
      ...copyRequest,
      requestId: crypto.randomUUID(),
    }),
    409,
  );
  const copyPath = "/api/pages/" + copy.id;
  const copied = await json(await request(copyPath));
  const gridId = (page) =>
    page.content.content[0].props.content[2].props.gridId;
  assert.equal(copied.visibility, "private");
  assert.equal(copied.cover_photo_id, upload.id);
  const original = await json(await request(sourcePath));
  assert.notEqual(gridId(original), gridId(copied));
  assert.deepEqual(
    (await json(await request(copyPath + "/json"))).page.blocks[0].blocks[2]
      .photos,
    photos,
  );

  const changed = structuredClone(exported);
  changed.page.title = "Edited outside the editor";
  changed.page.slug = "must-not-change";
  changed.page.blocks[0].blocks[0].text = "Updated in JSON";
  changed.page.blocks[0].blocks[2].photos.reverse();
  const sameReview = await json(
    await request(filePath, "POST", { file: changed }),
  );
  await json(
    await request(filePath, "POST", {
      file: changed,
      confirm: true,
      version: sameReview.version,
    }),
  );
  await json(await request(filePath, "POST", { file: changed }), 409);
  const updated = await json(await request(sourcePath));
  assert.equal(updated.title, changed.page.title);
  assert.equal(updated.slug, source.slug);
  assert.equal(updated.visibility, "private");
  assert.equal(
    updated.content.content[0].props.content[0].props.text,
    "Updated in JSON",
  );

  const targetReview = await json(
    await request(targetFile, "POST", { file: changed }),
  );
  const afterReview = await json(
    await request(targetPath, "PATCH", {
      version: target.version,
      visibility: "public",
    }),
  );
  assert.equal(afterReview.visibility, "public");
  await json(
    await request(targetFile, "POST", {
      file: changed,
      confirm: true,
      version: targetReview.version,
    }),
    409,
  );
  await json(
    await request(targetFile, "POST", {
      file: changed,
      confirm: true,
      version: afterReview.version,
    }),
  );
  const imported = await json(await request(targetPath));
  assert.equal(imported.visibility, "public");
  assert.equal(imported.slug, target.slug);
  assert.notEqual(gridId(imported), gridId(updated));
  assert.deepEqual(
    (await json(await request(targetFile))).page.blocks[0].blocks[2].photos,
    [...photos].reverse(),
  );
  assert.deepEqual(
    (await json(await request(copyPath + "/json"))).page.blocks[0].blocks[2]
      .photos,
    photos,
  );

  await json(
    await request(sourcePath + "/history/" + original.version, "POST", {
      version: updated.version,
      confirm: true,
    }),
  );
  const restored = await json(await request(filePath));
  assert.deepEqual(restored.page.blocks[0].blocks[2].photos, photos);
  assert.equal(restored.page.title, original.title);
  assert.equal(restored.page.date, "2024-11-27");
});
