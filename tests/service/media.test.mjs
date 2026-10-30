import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3005";
export async function call(path, method = "GET", data, cookie, origin = base) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}
export async function login(
  email = process.env.TEST_ADMIN_EMAIL,
  password = process.env.TEST_ADMIN_PASSWORD,
) {
  const response = await call("/api/auth/sign-in/email", "POST", {
    email,
    password,
  });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
}
test("only administrators may initiate uploads; originals have a deliberate size ceiling", async () => {
  assert.equal(
    (
      await call("/api/media/uploads", "POST", {
        name: "rose.jpg",
        size: 500,
        type: "image/jpeg",
      })
    ).status,
    401,
  );
  const cookie = await login();
  assert.equal(
    (
      await call(
        "/api/media/uploads",
        "POST",
        { name: "rose.jpg", size: 500, type: "image/jpeg" },
        cookie,
        "https://outside.test",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        "/api/media/uploads",
        "POST",
        { name: "rose.jpg", size: 25 * 1024 * 1024 + 1, type: "image/jpeg" },
        cookie,
      )
    ).status,
    413,
  );
  const response = await call(
    "/api/media/uploads",
    "POST",
    { name: "rose.jpg", size: 500, type: "image/jpeg" },
    cookie,
  );
  assert.equal(response.status, 201);
  const upload = await response.json();
  assert.match(upload.id, /^[\da-f-]{36}$/);
  assert.ok(upload.uploadUrl);
  assert.match(
    new URL(upload.uploadUrl).searchParams.get("X-Amz-SignedHeaders"),
    /content-length/,
  );
  assert.equal((await call("/api/media")).status, 401);
  assert.equal(
    (await call("/api/media/" + upload.id + "/original")).status,
    404,
  );
});

test("uploaded photos preserve protected originals and publish only stripped optimized display copies", async () => {
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 3000, height: 1500, channels: 3, background: "#769270" },
  })
    .jpeg()
    .withExif({
      IFD0: { Artist: "Private gardener", ImageDescription: "Hidden location" },
      IFD2: { GPSLatitudeRef: "N" },
    })
    .toBuffer();
  const cookie = await login();
  const started = await call(
    "/api/media/uploads",
    "POST",
    { name: "rosemary.jpg", size: bytes.length, type: "image/jpeg" },
    cookie,
  );
  assert.equal(started.status, 201);
  const upload = await started.json();
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
  const completed = await call(
    "/api/media/" + upload.id + "/complete",
    "POST",
    {},
    cookie,
  );
  assert.equal(completed.status, 200);
  const photo = await completed.json();
  assert.equal(photo.publiclyAccessible, false);
  assert.deepEqual(photo.usages, []);
  assert.equal((await call("/api/media/" + photo.id + "/display")).status, 404);
  assert.equal(
    (await call("/api/media/" + photo.id + "/original")).status,
    404,
  );
  const other = await login(
    process.env.TEST_OTHER_EMAIL,
    process.env.TEST_OTHER_PASSWORD,
  );
  const original = await call(
    "/api/media/" + photo.id + "/original",
    "GET",
    undefined,
    other,
  );
  assert.equal(original.status, 200);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), bytes);
  const display = await call(
    "/api/media/" + photo.id + "/display",
    "GET",
    undefined,
    cookie,
  );
  assert.equal(display.status, 200);
  assert.match(display.headers.get("cache-control"), /no-store/);
  const optimized = Buffer.from(await display.arrayBuffer()),
    meta = await sharp(optimized).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 2560);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.xmp, undefined);
  assert.equal(meta.icc, undefined);
  assert.ok(optimized.length < bytes.length);
  assert.equal((await call("/api/media", "GET", undefined, other)).status, 200);
  // A replay of the browser-writable staging URL cannot replace a completed original.
  await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: Buffer.from("replayed bytes"),
  });
  assert.equal(
    (await call("/api/media/" + photo.id + "/complete", "POST", {}, cookie))
      .status,
    200,
  );
  assert.deepEqual(
    Buffer.from(
      await (
        await call(
          "/api/media/" + photo.id + "/original",
          "GET",
          undefined,
          cookie,
        )
      ).arrayBuffer(),
    ),
    bytes,
  );
});

test("nested shared photos lose anonymous access immediately after the final public usage ends", async () => {
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 40, height: 40, channels: 3, background: "#aabbcc" },
  })
    .png()
    .toBuffer();
  const cookie = await login();
  const upload = await (
    await call(
      "/api/media/uploads",
      "POST",
      { name: "shared.png", size: bytes.length, type: "image/png" },
      cookie,
    )
  ).json();
  await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: bytes,
  });
  assert.equal(
    (await call("/api/media/" + upload.id + "/complete", "POST", {}, cookie))
      .status,
    200,
  );
  const photoPath = "/api/media/" + upload.id;
  async function create(title) {
    return (await call("/api/pages", "POST", { title }, cookie)).json();
  }
  async function update(page, visibility, content) {
    const response = await call(
      "/api/pages/" + page.id,
      "PATCH",
      {
        title: page.title,
        version: page.version,
        visibility,
        ...(content ? { content } : {}),
      },
      cookie,
    );
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  }
  const nested = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "section-shared",
          content: [
            {
              type: "Columns",
              props: {
                id: "columns-shared",
                left: [
                  {
                    type: "Image",
                    props: {
                      id: "photo-shared",
                      photoId: upload.id,
                      alt: "A shared flower",
                    },
                  },
                ],
                right: [],
              },
            },
          ],
        },
      },
    ],
  };
  let first = await create("First shared page"),
    second = await create("Second shared page");
  first = await update(first, "private", nested);
  assert.equal((await call(photoPath + "/display")).status, 404);
  second = await update(second, "public", nested);
  assert.equal((await call(photoPath + "/display")).status, 200);
  let details = await (await call(photoPath, "GET", undefined, cookie)).json();
  assert.equal(details.publiclyAccessible, true);
  assert.equal(details.usages.length, 2);
  first = await update(first, "public");
  second = await update(second, "private");
  assert.equal((await call(photoPath + "/display")).status, 200);
  first = await update(first, "private");
  assert.equal((await call(photoPath + "/display")).status, 404);
  assert.equal(
    (await call(photoPath + "/display", "GET", undefined, cookie)).status,
    200,
  );
  assert.equal((await call(photoPath + "/original")).status, 404);
  second = await update(second, "public");
  assert.equal((await call(photoPath + "/display")).status, 200);
  second = await update(second, "public", { root: { props: {} }, content: [] });
  assert.equal((await call(photoPath + "/display")).status, 404);
  details = await (await call(photoPath, "GET", undefined, cookie)).json();
  assert.equal(details.publiclyAccessible, false);
  assert.equal(details.usages.length, 1);
});

test("invalid image bytes and mismatched sizes never become usable photos", async () => {
  const cookie = await login();
  for (const [name, bytes, size] of [
    [
      "disguised.jpg",
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>',
      ),
      undefined,
    ],
    ["wrong-size.jpg", Buffer.from("too much data"), 1],
  ]) {
    const upload = await (
      await call(
        "/api/media/uploads",
        "POST",
        { name, size: size ?? bytes.length, type: "image/jpeg" },
        cookie,
      )
    ).json();
    await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: bytes,
    });
    assert.equal(
      (await call("/api/media/" + upload.id + "/complete", "POST", {}, cookie))
        .status,
      400,
    );
    assert.equal(
      (await call("/api/media/" + upload.id, "GET", undefined, cookie)).status,
      404,
    );
    assert.equal(
      (
        await call(
          "/api/media/" + upload.id + "/display",
          "GET",
          undefined,
          cookie,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call(
          "/api/media/" + upload.id + "/original",
          "GET",
          undefined,
          cookie,
        )
      ).status,
      404,
    );
  }
});

test("a genuine non-administrator session cannot enter the library, finalize uploads or read protected originals", async () => {
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
    const library = await (
      await call("/api/media", "GET", undefined, owner)
    ).json();
    assert.ok(library.length);
    const id = library[0].id;
    assert.equal(
      (await call("/api/media", "GET", undefined, outsider)).status,
      401,
    );
    assert.equal(
      (
        await call(
          "/api/media/uploads",
          "POST",
          { name: "intrusion.jpg", size: 1, type: "image/jpeg" },
          outsider,
        )
      ).status,
      401,
    );
    assert.equal(
      (await call("/api/media/" + id + "/complete", "POST", {}, outsider))
        .status,
      401,
    );
    assert.equal(
      (await call("/api/media/" + id + "/original", "GET", undefined, outsider))
        .status,
      404,
    );
    assert.equal(
      (await call("/api/media/" + id, "GET", undefined, outsider)).status,
      401,
    );
  } finally {
    await options.database.end();
  }
});
