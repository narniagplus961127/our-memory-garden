import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import sharp from "sharp";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3013";
const connection = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (
  new URL(base).hostname !== "127.0.0.1" ||
  new URL(connection).hostname !== "127.0.0.1"
)
  throw Error("Photo metadata tests require loopback services.");
const sql = postgres(connection, { max: 1, ssl: false });
const call = (path, method = "GET", data, cookie, origin = base) =>
  fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
test("photo metadata validates, protects concurrent edits and keeps photo identity, bytes and private labels intact", async () => {
  const signed = await call("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  assert.equal(signed.status, 200);
  const cookie = signed.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const bytes = await sharp({
    create: { width: 36, height: 24, channels: 3, background: "#8a9c77" },
  })
    .jpeg()
    .toBuffer();
  const start = await call(
    "/api/media/uploads",
    "POST",
    { name: randomUUID() + ".jpg", type: "image/jpeg", size: bytes.length },
    cookie,
  );
  assert.equal(start.status, 201);
  const upload = await start.json();
  await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: bytes,
  });
  assert.equal(
    (await call(`/api/media/${upload.id}/complete`, "POST", {}, cookie)).status,
    200,
  );
  const path = `/api/media/${upload.id}`;
  const [identity] =
    await sql`select id,original_key,display_key,original_sha256,original_bytes,display_bytes from media_photos where id=${upload.id}`;
  let pageId, exportId;
  try {
    const fields = {
      name: "Friendly name",
      labels: [" Penang ", "PENANG", "黄昏"],
      metadataVersion: 0,
    };
    assert.equal((await call(path, "PATCH", fields)).status, 401);
    assert.equal(
      (await call(path, "PATCH", fields, cookie, "https://outside.test"))
        .status,
      403,
    );
    for (const invalid of [
      { ...fields, name: " " },
      { ...fields, labels: ["x".repeat(41)] },
      { ...fields, labels: Array(21).fill("x") },
      { ...fields, labels: ["bad\0"] },
      { ...fields, labels: null },
      { ...fields, original_key: "changed" },
      { ...fields, metadataVersion: -1 },
    ])
      assert.equal((await call(path, "PATCH", invalid, cookie)).status, 400);
    const response = await call(path, "PATCH", fields, cookie);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /private/);
    const saved = await response.json();
    assert.equal(saved.name, "Friendly name");
    assert.deepEqual(saved.labels, ["Penang", "黄昏"]);
    assert.equal(saved.metadataVersion, 1);
    const retry = await call(path, "PATCH", fields, cookie);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).metadataVersion, 1);
    assert.equal(
      (
        await call(
          path,
          "PATCH",
          { name: "Stale draft", labels: [], metadataVersion: 0 },
          cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (await (await call(path, "GET", undefined, cookie)).json()).name,
      "Friendly name",
    );
    assert.equal(
      (
        await call(
          path,
          "PATCH",
          { name: "Friendly name", labels: [], metadataVersion: 1 },
          cookie,
        )
      ).status,
      200,
    );
    const cleared = await (await call(path, "GET", undefined, cookie)).json();
    assert.deepEqual(cleared.labels, []);
    assert.equal(cleared.metadataVersion, 2);
    const secret = "Private-" + randomUUID().slice(0, 20);
    const maximum = await call(
      path,
      "PATCH",
      {
        name: "中".repeat(200),
        labels: Array.from(
          { length: 20 },
          (_, i) => String(i) + "中".repeat(38),
        ),
        metadataVersion: 2,
      },
      cookie,
    );
    assert.equal(maximum.status, 200, await maximum.text());
    assert.equal(
      (
        await call(
          path,
          "PATCH",
          { name: "Public image name", labels: [secret], metadataVersion: 3 },
          cookie,
        )
      ).status,
      200,
    );
    const created = await (
      await call(
        "/api/pages",
        "POST",
        { title: "Photo metadata " + randomUUID() },
        cookie,
      )
    ).json();
    pageId = created.id;
    const content = {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: "section",
            content: [
              {
                type: "Image",
                props: {
                  id: "image",
                  photoId: upload.id,
                  alt: "Visible image",
                },
              },
            ],
          },
        },
      ],
    };
    const publish = await call(
      `/api/pages/${pageId}`,
      "PATCH",
      { version: created.version, visibility: "public", content },
      cookie,
    );
    assert.equal(publish.status, 200);
    const html = await (await call(`/p/${pageId}`)).text();
    assert.equal(html.includes(secret), false);
    const display = await call(path + "/display");
    assert.equal(display.status, 200);
    const etag = display.headers.get("etag");
    await display.arrayBuffer();
    assert.equal((await call(path + "/original")).status, 404);
    const listed = await (
      await call(
        `/api/media?view=library&search=${secret}`,
        "GET",
        undefined,
        cookie,
      )
    ).json();
    assert.equal(
      listed.photos.some((photo) => photo.id === upload.id),
      true,
    );
    const grid = await (
      await call(
        `/api/media?view=grid-picker&search=${secret}`,
        "GET",
        undefined,
        cookie,
      )
    ).json();
    assert.equal(
      grid.photos.some((photo) => photo.photoId === upload.id),
      true,
    );
    assert.equal(
      (await call(path, "DELETE", { confirm: true }, cookie)).status,
      409,
    );
    const [after] =
      await sql`select id,original_key,display_key,original_sha256,original_bytes,display_bytes from media_photos where id=${upload.id}`;
    assert.deepEqual(after, identity);
    const unchanged = await fetch(base + path + "/display", {
      headers: { "If-None-Match": etag },
    });
    assert.equal(unchanged.status, 304);
    const snapshot = await call("/api/exports", "POST", {}, cookie);
    assert.equal(snapshot.status, 202);
    exportId = (await snapshot.json()).id;
    const [record] =
      await sql`select document from garden_export_records where export_id=${exportId} and kind='photos' and document->>'id'=${upload.id}`;
    assert.equal(record.document.name, "Public image name");
    assert.deepEqual(record.document.labels, [secret]);
  } finally {
    if (exportId)
      await call(
        `/api/exports/${exportId}`,
        "DELETE",
        { confirm: true },
        cookie,
      );
    if (pageId) await sql`delete from pages where id=${pageId}`;
    await call(path, "DELETE", { confirm: true }, cookie);
    await sql.end();
  }
});
