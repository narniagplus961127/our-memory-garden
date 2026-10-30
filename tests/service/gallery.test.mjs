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
test("ordered nested galleries persist captions and enforce current photo privacy", async () => {
  const auth = await call("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  assert.equal(auth.status, 200);
  const cookie = auth.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  const ids = [];
  for (const color of ["#778855", "#aa7744"]) {
    const bytes = await sharp({
      create: { width: 80, height: 60, channels: 3, background: color },
    })
      .png()
      .toBuffer();
    const upload = await (
      await call(
        "/api/media/uploads",
        "POST",
        { name: "gallery.png", size: bytes.length, type: "image/png" },
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
      (await call(`/api/media/${upload.id}/complete`, "POST", {}, cookie))
        .status,
      200,
    );
    ids.push(upload.id);
  }
  let page = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Gallery privacy " + Date.now() },
      cookie,
    )
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "gallery-section",
          content: [
            {
              type: "Gallery",
              props: {
                id: "gallery",
                photos: [
                  { photoId: ids[1], caption: "Second flower first" },
                  { photoId: ids[0], caption: "A quiet morning" },
                ],
              },
            },
          ],
        },
      },
    ],
  };
  const save = async (visibility, data = content) => {
    const response = await call(
      `/api/pages/${page.id}`,
      "PATCH",
      { title: page.title, version: page.version, visibility, content: data },
      cookie,
    );
    assert.equal(response.status, 200, await response.clone().text());
    page = await response.json();
  };
  await save("private");
  assert.deepEqual(
    (
      await (
        await call(`/api/pages/${page.id}`, "GET", undefined, cookie)
      ).json()
    ).content,
    content,
  );
  for (const id of ids)
    assert.equal((await call(`/api/media/${id}/display`)).status, 404);
  await save("public");
  for (const id of ids) {
    assert.equal((await call(`/api/media/${id}/display`)).status, 200);
    assert.equal((await call(`/api/media/${id}/original`)).status, 404);
  }
  const bad = structuredClone(content);
  bad.content[0].props.content[0].props.photos[0].photoId = crypto.randomUUID();
  const rejected = await call(
    `/api/pages/${page.id}`,
    "PATCH",
    { title: page.title, version: page.version, content: bad },
    cookie,
  );
  assert.equal(rejected.status, 400);
  assert.match((await rejected.json()).error, /ready photo/i);
  await save("private");
  for (const id of ids)
    assert.equal((await call(`/api/media/${id}/display`)).status, 404);
});
