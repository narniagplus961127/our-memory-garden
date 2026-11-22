import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
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
  assert.equal(display.headers.get("cache-control"), "private, no-cache");
  const displayTag = display.headers.get("etag");
  assert.ok(displayTag);
  const privateRevalidation = await fetch(
    base + "/api/media/" + photo.id + "/display",
    {
      headers: { Cookie: other, "If-None-Match": displayTag },
    },
  );
  assert.equal(privateRevalidation.status, 304);
  assert.equal((await privateRevalidation.arrayBuffer()).byteLength, 0);
  assert.equal(
    (
      await fetch(base + "/api/media/" + photo.id + "/display", {
        headers: { "If-None-Match": displayTag },
      })
    ).status,
    404,
  );
  const optimized = Buffer.from(await display.arrayBuffer()),
    meta = await sharp(optimized).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 2560);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.xmp, undefined);
  assert.equal(meta.icc, undefined);
  assert.ok(optimized.length < bytes.length);
  const photoPath = "/api/media/" + photo.id;
  assert.equal((await call(photoPath + "/thumb-320")).status, 404);
  assert.equal(
    (await call(photoPath + "/thumb-321", "GET", undefined, cookie)).status,
    404,
  );
  for (const width of [320, 640, 1280]) {
    const response = await call(
      photoPath + "/thumb-" + width,
      "GET",
      undefined,
      cookie,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-cache");
    assert.match(response.headers.get("vary"), /(?:^|,\s*)Cookie(?:,|$)/i);
    const tag = response.headers.get("etag");
    assert.ok(tag);
    const revalidated = await fetch(base + photoPath + "/thumb-" + width, {
      headers: { Cookie: cookie, "If-None-Match": tag },
    });
    assert.equal(revalidated.status, 304);
    assert.equal((await revalidated.arrayBuffer()).byteLength, 0);
    const anonymous = await fetch(base + photoPath + "/thumb-" + width, {
      headers: { "If-None-Match": tag },
    });
    assert.equal(anonymous.status, 404);
    const thumbnail = Buffer.from(await response.arrayBuffer());
    const dimensions = await sharp(thumbnail).metadata();
    assert.equal(dimensions.format, "webp");
    assert.equal(dimensions.width, width);
    assert.equal(dimensions.height, width / 2);
    assert.equal(dimensions.exif, undefined);
    assert.ok(thumbnail.length < optimized.length);
  }
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
    create: { width: 700, height: 400, channels: 3, background: "#aabbcc" },
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
  const display = await call(photoPath + "/display");
  assert.equal(display.status, 200);
  assert.equal(display.headers.get("cache-control"), "private, no-cache");
  const etag = display.headers.get("etag");
  assert.ok(etag);
  const thumbnail = await call(photoPath + "/thumb-320");
  assert.equal(thumbnail.status, 200);
  assert.equal(thumbnail.headers.get("cache-control"), "private, no-cache");
  const thumbTag = thumbnail.headers.get("etag");
  assert.ok(thumbTag);
  assert.notEqual(thumbTag, etag);
  assert.ok(
    (await thumbnail.arrayBuffer()).byteLength <
      (await display.arrayBuffer()).byteLength,
  );
  const revalidate = (tag, path = "/display") =>
    fetch(base + photoPath + path, { headers: { "If-None-Match": tag } });
  const unchanged = await revalidate('"different", W/' + etag);
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.headers.get("etag"), etag);
  assert.equal((await unchanged.arrayBuffer()).byteLength, 0);
  assert.equal((await revalidate('"different"')).status, 200);
  assert.equal((await revalidate(thumbTag, "/thumb-320")).status, 304);
  assert.equal((await revalidate(thumbTag, "/thumb-640")).status, 200);
  let details = await (await call(photoPath, "GET", undefined, cookie)).json();
  assert.equal(details.publiclyAccessible, true);
  assert.equal(details.usages.length, 2);
  const results = await call(
    "/api/media?view=library&search=SECOND%20SHARED%20PAGE",
    "GET",
    undefined,
    cookie,
  );
  assert.equal(results.status, 200);
  const { photos } = await results.json();
  const item = photos.find((photo) => photo.id === upload.id);
  assert.ok(item);
  assert.equal(item.usageCount, 2);
  assert.equal(item.publiclyAccessible, true);
  assert.equal("usages" in item, false);
  assert.equal("original_bytes" in item, false);
  first = await update(first, "public");
  second = await update(second, "private");
  assert.equal((await call(photoPath + "/display")).status, 200);
  first = await update(first, "private");
  assert.equal((await revalidate(etag)).status, 404);
  assert.equal((await revalidate(thumbTag, "/thumb-320")).status, 404);
  assert.equal((await revalidate("*", "/thumb-1280")).status, 404);
  assert.equal((await revalidate("*")).status, 404);
  assert.equal((await revalidate(etag, "/original")).status, 404);
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
  assert.equal(details.usages.filter((usage) => !usage.history).length, 1);
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

test("page saving rejects missing and still-pending photo references inside nested blocks", async () => {
  const cookie = await login();
  const page = await (
    await call("/api/pages", "POST", { title: "Ready photos only" }, cookie)
  ).json();
  const pending = await (
    await call(
      "/api/media/uploads",
      "POST",
      { name: "not-ready.jpg", size: 100, type: "image/jpeg" },
      cookie,
    )
  ).json();
  for (const id of [crypto.randomUUID(), pending.id]) {
    const content = {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: "photo-validation-section",
            content: [
              {
                type: "Image",
                props: {
                  id: "photo-validation-image",
                  photoId: id,
                  alt: "A ready photograph",
                },
              },
            ],
          },
        },
      ],
    };
    const response = await call(
      "/api/pages/" + page.id,
      "PATCH",
      { title: page.title, version: page.version, content },
      cookie,
    );
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /ready photo/i);
    assert.equal(
      (
        await (
          await call("/api/pages/" + page.id, "GET", undefined, cookie)
        ).json()
      ).version,
      page.version,
    );
  }
});

test("the Media Library reads stable pages across uploads and deletions", async (t) => {
  const connection = process.env.DATABASE_URL;
  if (
    process.env.AUTH_MODE !== "local" ||
    !connection ||
    !["127.0.0.1", "localhost"].includes(new URL(connection).hostname)
  ) {
    t.skip("Needs the loopback Media Library fixture.");
    return;
  }
  const sql = postgres(connection, { max: 1 });
  const prefix = "library-page-" + crypto.randomUUID();
  const cookie = await login();
  const batch = (params) =>
    call(
      "/api/media?" + new URLSearchParams({ view: "library", ...params }),
      "GET",
      undefined,
      cookie,
    );

  try {
    const [admin] =
      await sql`select user_id from garden_administrators where lower(email)=${process.env.TEST_ADMIN_EMAIL.toLowerCase()}`;
    const ready = Array.from({ length: 27 }, (_, index) => {
      const id = crypto.randomUUID();
      return {
        id,
        name: prefix + "-" + index,
        status: "ready",
        expected_bytes: 100,
        width: 320,
        height: 240,
        staging_key: "staging/" + id,
        display_key: id + "/display.webp",
        original_key: id + "/original",
        created_by: admin.user_id,
        created_at: "2026-01-20T02:03:04.123456Z",
      };
    });
    await sql`insert into media_photos ${sql(ready)}`;
    const expected = ready
      .map((photo) => photo.id)
      .sort()
      .reverse();
    const first = await batch({ search: prefix.toUpperCase() });
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("cache-control"), "private, no-store");
    const page = await first.json();
    assert.deepEqual(
      page.photos.map((photo) => photo.id),
      expected.slice(0, 24),
    );
    assert.ok(page.nextCursor);

    const anchor = expected[23];
    await sql`delete from media_photos where id=${anchor}`;
    const newId = crypto.randomUUID();
    await sql`insert into media_photos ${sql({
      ...ready[0],
      id: newId,
      name: prefix + "-new",
      staging_key: "staging/" + newId,
      display_key: newId + "/display.webp",
      original_key: newId + "/original",
      created_at: "2026-01-20T02:03:04.123999Z",
    })}`;
    const next = await batch({ search: prefix, after: page.nextCursor });
    assert.equal(next.status, 200);
    const last = await next.json();
    assert.deepEqual(
      last.photos.map((photo) => photo.id),
      expected.slice(24),
    );
    assert.equal(last.nextCursor, null);
    assert.equal((await batch({ after: "invalid-cursor" })).status, 400);
    assert.equal(
      (await batch({ after: "2026-02-30T02:03:04.123456Z/" + anchor })).status,
      400,
    );
  } finally {
    await sql`delete from media_photos where starts_with(name,${prefix})`;
    await sql.end();
  }
});
