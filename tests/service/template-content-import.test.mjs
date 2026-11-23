import test from "node:test";
import assert from "node:assert/strict";

test("template imports replace only content, preserve history and reject ambiguous or unavailable sources", async () => {
  const origin = process.env.TEST_BASE_URL;
  assert.equal(new URL(origin).hostname, "127.0.0.1");
  const headers = { Origin: origin, "Content-Type": "application/json" };
  async function call(path, method = "GET", body, auth = true) {
    return fetch(origin + path, {
      method,
      headers: auth
        ? headers
        : { Origin: origin, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function json(response, status = 200) {
    const value = await response.json();
    assert.equal(response.status, status, JSON.stringify(value).slice(0, 250));
    return value;
  }
  const login = await call("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  assert.equal(login.status, 200);
  headers.Cookie = login.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  const suffix = crypto.randomUUID().slice(0, 8);
  const page = await json(
    await call("/api/pages", "POST", { title: "Import destination " + suffix }),
    201,
  );
  const path = `/api/pages/${page.id}`;
  await json(
    await call(path + "/details", "PATCH", {
      date: "2024-11-27",
      metadataVersion: page.metadata_version,
      categoryIds: [],
      coverPhotoId: null,
    }),
  );
  const before = await json(await call(path));
  const template = await json(
    await call("/api/templates", "POST", { name: "Import source " + suffix }),
    201,
  );
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "section",
          content: [
            {
              type: "Text",
              props: { id: "text", text: "A template memory", style: "p" },
            },
            {
              type: "Image",
              props: {
                id: "photo",
                photoId: crypto.randomUUID(),
                alt: "Placeholder",
              },
            },
          ],
        },
      },
    ],
  };
  const saved = await json(
    await call(`/api/templates/${template.id}`, "PATCH", {
      name: template.name,
      version: template.version,
      content,
    }),
  );
  const sources = await json(await call(path + "/json?sources=templates"));
  assert.ok(sources.some((item) => item.id === template.id));
  assert.equal(
    sources.some((item) => "content" in item),
    false,
  );
  assert.equal(
    (await call(path + "/json?sources=templates", "GET", undefined, false))
      .status,
    401,
  );
  assert.equal(
    (
      await call(
        path + "/json",
        "POST",
        { sourceTemplateId: template.id },
        false,
      )
    ).status,
    401,
  );
  for (const invalid of [
    { sourceTemplateId: template.id, file: {} },
    { sourceTemplateId: template.id, sourcePageId: page.id },
    { sourceTemplateId: 42 },
  ])
    assert.equal((await call(path + "/json", "POST", invalid)).status, 400);
  assert.equal(
    (
      await call(path + "/json", "POST", {
        sourceTemplateId: crypto.randomUUID(),
      })
    ).status,
    404,
  );
  const review = await json(
    await call(path + "/json", "POST", { sourceTemplateId: template.id }),
  );
  assert.equal(review.blocks, 3);
  assert.equal(review.photos, 0);
  assert.equal((await json(await call(path))).version, before.version);
  await json(
    await call(path + "/json", "POST", {
      sourceTemplateId: template.id,
      confirm: true,
    }),
  );
  const after = await json(await call(path));
  for (const key of [
    "title",
    "slug",
    "page_date",
    "visibility",
    "metadata_version",
    "category_ids",
    "cover_photo_id",
  ])
    assert.deepEqual(after[key], before[key], key);
  assert.deepEqual(after.content.root, before.content.root);
  assert.equal(after.version, before.version + 1);
  assert.equal(
    after.content.content[0].props.content[0].props.text,
    "A template memory",
  );
  assert.equal(
    after.content.content[0].props.content[1].props.photoId,
    undefined,
  );
  assert.notEqual(
    after.content.content[0].props.id,
    saved.content.content[0].props.id,
  );
  const history = await json(await call(path + "/history"));
  assert.ok(
    history.groups.some((group) =>
      group.versions.some((revision) => revision.version === before.version),
    ),
  );
  assert.equal(
    (
      await call(`/api/templates/${template.id}`, "DELETE", {
        confirm: true,
        version: saved.version,
      })
    ).status,
    204,
  );
  assert.equal(
    (
      await call(path + "/json", "POST", {
        sourceTemplateId: template.id,
        confirm: true,
      })
    ).status,
    404,
  );
  assert.equal((await json(await call(path))).version, after.version);
});
