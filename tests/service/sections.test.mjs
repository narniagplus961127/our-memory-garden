import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
const base = process.env.TEST_BASE_URL;
async function call(path, method = "GET", body, cookie) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
test("section backgrounds retain photo privacy and reference protection; unsafe styles are rejected", async () => {
  const auth = await call("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  assert.equal(auth.status, 200);
  const cookie = auth.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#b7cbb8" },
  })
    .png()
    .toBuffer();
  const upload = await (
    await call(
      "/api/media/uploads",
      "POST",
      { name: "section-background.png", size: bytes.length, type: "image/png" },
      cookie,
    )
  ).json();
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
  assert.equal(
    (await call(`/api/media/${upload.id}/complete`, "POST", {}, cookie)).status,
    200,
  );
  let garden = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Section media " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  assert.deepEqual(garden.content.content, []);
  for (const template of ["story", "journal"]) {
    const page = await (
      await call(
        "/api/pages",
        "POST",
        { title: template + crypto.randomUUID(), template },
        cookie,
      )
    ).json();
    assert.ok(page.content.content.length);
    assert.ok(page.content.content.every((b) => b.type === "Section"));
  }
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "photo-section",
          backgroundImage: { photoId: upload.id },
          contentBackground: { mode: "custom", colour: "#ffffff" },
          backgroundColor: "#c8ddce",
          borderColor: "#304337",
          borderWidth: 2,
          columnAlignment: "bottom",
          paddingSides: { top: 20, right: 10, bottom: 24, left: 10 },
          content: [
            {
              type: "Text",
              props: {
                id: "section-text",
                text: "A garden together",
                style: "p",
              },
            },
          ],
        },
      },
    ],
  };
  async function save(visibility) {
    const response = await call(
      "/api/pages/" + garden.id,
      "PATCH",
      { version: garden.version, visibility, content },
      cookie,
    );
    assert.equal(response.status, 200, await response.clone().text());
    garden = await response.json();
  }
  await save("private");
  assert.deepEqual(garden.content, content);
  assert.equal((await call(`/api/media/${upload.id}/display`)).status, 404);
  await save("public");
  assert.equal((await call(`/api/media/${upload.id}/display`)).status, 200);
  assert.equal((await call(`/api/media/${upload.id}/original`)).status, 404);
  const html = await (await fetch(base + "/p/" + garden.id)).text();
  assert.ok(html.includes(`/api/media/${upload.id}/display`));
  assert.match(html, /background-image:url/);
  assert.equal(
    (await call(`/api/media/${upload.id}`, "DELETE", { confirm: true }, cookie))
      .status,
    409,
  );
  for (const [key, value] of [
    ["backgroundImage", { photoId: "url(javascript:alert(1))" }],
    ["backgroundImage", { photoId: crypto.randomUUID() }],
    ["backgroundImage", { photoId: upload.id, url: "https://example.com" }],
    ["contentBackground", { mode: "custom", colour: "red;display:none" }],
    ["contentBackground", { mode: "script" }],
    ["borderWidth", -1],
    ["borderWidth", 13],
    ["borderColor", "url(javascript:x)"],
    ["columnAlignment", "fixed"],
  ]) {
    const bad = structuredClone(content);
    bad.content[0].props[key] = value;
    assert.equal(
      (
        await call(
          "/api/pages/" + garden.id,
          "PATCH",
          { version: garden.version, content: bad },
          cookie,
        )
      ).status,
      400,
      key,
    );
  }
  await save("private");
  assert.equal((await call(`/api/media/${upload.id}/display`)).status, 404);
});
