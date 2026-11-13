import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const base = process.env.TEST_BASE_URL;

test("Photo grid stores large collections separately and preserves access, revisions and copies", async () => {
  let cookie;
  async function call(path, method = "GET", body, signedIn = true) {
    return fetch(base + path, {
      method,
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        ...(signedIn && cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function json(response, status = 200) {
    const body = await response.json();
    assert.equal(response.status, status, JSON.stringify(body).slice(0, 500));
    return body;
  }
  const auth = await call("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  assert.equal(auth.status, 200);
  cookie = auth.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const bytes = await sharp({
    create: { width: 60, height: 100, channels: 3, background: "#7f8860" },
  })
    .png()
    .toBuffer();
  const upload = await json(
    await call("/api/media/uploads", "POST", {
      name: "Fern grid.png",
      size: bytes.length,
      type: "image/png",
    }),
    201,
  );
  assert.equal(
    (
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: bytes,
      })
    ).status,
    200,
  );
  await json(await call("/api/media/" + upload.id + "/complete", "POST", {}));
  let page = await json(
    await call("/api/pages", "POST", { title: "Large grid " + Date.now() }),
    201,
  );
  const path = "/api/pages/" + page.id;
  const gridPath = path + "/photo-grid/grid";
  const block = (current) => current.content.content[0].props.content[0].props;
  const ref = (current) => ({
    gridId: block(current).gridId,
    gridRevision: block(current).gridRevision,
  });
  const url = (current, extra = "") =>
    gridPath +
    "?grid=" +
    block(current).gridId +
    "&revision=" +
    block(current).gridRevision +
    extra;
  const patch = async (changes) => {
    page = await json(
      await call(path, "PATCH", { version: page.version, ...changes }),
    );
  };
  await patch({
    content: {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: "section",
            content: [{ type: "PhotoGrid", props: { id: "grid" } }],
          },
        },
      ],
    },
  });
  const emptyPage = page;
  const items = Array.from({ length: 103 }, () => ({
    entryId: crypto.randomUUID(),
    photoId: upload.id,
  }));
  const addBatch = (photos) => ({
    ...ref(page),
    action: "add",
    photos,
    requestId: crypto.randomUUID(),
  });
  const first = addBatch(items.slice(0, 100));
  const firstSaved = await json(await call(gridPath, "PATCH", first));
  page = firstSaved.page;
  assert.equal(
    (await json(await call(gridPath, "PATCH", first))).page.version,
    page.version,
  );
  const stale = addBatch(items.slice(100));
  page = (await json(await call(gridPath, "PATCH", stale))).page;
  assert.equal(
    (
      await call(gridPath, "PATCH", {
        ...stale,
        requestId: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  const firstBatch = await json(await call(url(page)));
  assert.equal(firstBatch.photos.length, 24);
  assert.equal(firstBatch.next, 24);
  assert.equal(firstBatch.photos[0].height, 100);
  assert.equal(
    (
      await json(await call("/api/media?view=grid-picker&search=Fern%20grid"))
    ).photos.some((photo) => photo.photoId === upload.id),
    true,
  );
  assert.equal(
    (await call("/api/media?view=grid-picker", "GET", undefined, false)).status,
    401,
  );
  assert.equal(
    (await json(await call(url(page, "&offset=96")))).photos.length,
    7,
  );
  assert.equal((await call(url(page), "GET", undefined, false)).status, 404);
  assert.equal(
    (
      await call(
        "/api/media/" + upload.id + "/display",
        "GET",
        undefined,
        false,
      )
    ).status,
    404,
  );
  assert.equal(
    (await json(await call("/api/media/" + upload.id))).usages.some(
      (usage) => usage.id === page.id,
    ),
    true,
  );
  const currentBeforeEdit = page;
  const edit = {
    ...ref(page),
    action: "edit",
    entryId: items[0].entryId,
    alt: "A tall fern",
    caption: "The fern house",
    requestId: crypto.randomUUID(),
  };
  page = (await json(await call(gridPath, "PATCH", edit))).page;
  assert.equal(
    (await json(await call(url(page)))).photos[0].alt,
    "A tall fern",
  );
  page = (
    await json(
      await call(gridPath, "PATCH", {
        ...ref(page),
        action: "move",
        entryId: items[0].entryId,
        before: items[2].entryId,
        requestId: crypto.randomUUID(),
      }),
    )
  ).page;
  assert.deepEqual(
    (await json(await call(url(page)))).photos
      .slice(0, 3)
      .map((photo) => photo.entryId),
    [items[1].entryId, items[0].entryId, items[2].entryId],
  );
  assert.equal(
    (
      await json(
        await call(
          url(currentBeforeEdit, "&history=" + currentBeforeEdit.version),
        ),
      )
    ).photos[0].alt,
    "",
  );
  assert.equal(
    (
      await call(
        url(currentBeforeEdit, "&history=" + currentBeforeEdit.version),
        "GET",
        undefined,
        false,
      )
    ).status,
    404,
  );
  const duplicate = structuredClone(page.content);
  duplicate.content[0].props.content.push({
    type: "PhotoGrid",
    props: { ...block(page), id: "copy" },
  });
  await patch({ content: duplicate, visibility: "public" });
  const clone = page.content.content[0].props.content[1].props;
  assert.notEqual(clone.gridId, block(page).gridId);
  const publicBatch = await json(
    await call(url(page), "GET", undefined, false),
  );
  assert.equal(publicBatch.photos[1].caption, "The fern house");
  assert.equal("name" in publicBatch.photos[1], false);
  const cloned = await json(
    await call(
      path +
        "/photo-grid/copy?grid=" +
        clone.gridId +
        "&revision=" +
        clone.gridRevision,
    ),
  );
  assert.equal(cloned.photos[1].caption, "The fern house");
  assert.notEqual(cloned.photos[1].entryId, publicBatch.photos[1].entryId);
  assert.equal(
    (
      await call(
        "/api/media/" + upload.id + "/display",
        "GET",
        undefined,
        false,
      )
    ).status,
    200,
  );
  const template = await json(
    await call("/api/templates", "POST", {
      name: "Grid without photos " + Date.now(),
      pageId: page.id,
      pageVersion: page.version,
    }),
    201,
  );
  assert.equal(block(template).gridId, undefined);
  const templatePage = await json(
    await call("/api/pages", "POST", {
      title: "Grid template copy " + Date.now(),
      template: template.id,
    }),
    201,
  );
  assert.notEqual(block(templatePage).gridId, block(page).gridId);
  assert.equal(
    (
      await json(
        await call(
          "/api/pages/" +
            templatePage.id +
            "/photo-grid/" +
            block(templatePage).id +
            "?grid=" +
            block(templatePage).gridId +
            "&revision=1",
        ),
      )
    ).photos.length,
    0,
  );
  const afterRestore = await json(
    await call(path + "/history/" + emptyPage.version, "POST", {
      version: page.version,
      confirm: true,
    }),
  );
  assert.equal((await json(await call(url(afterRestore)))).photos.length, 0);
  assert.equal(
    (
      await call(
        "/api/media/" + upload.id + "/display",
        "GET",
        undefined,
        false,
      )
    ).status,
    404,
  );
  assert.equal(
    (await json(await call("/api/media/" + upload.id))).usages.some(
      (usage) => usage.id === page.id,
    ),
    false,
  );
});
