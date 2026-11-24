import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import postgres from "postgres";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3013";
const connection = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (
  !["127.0.0.1", "localhost"].includes(new URL(base).hostname) ||
  new URL(connection).hostname !== "127.0.0.1"
)
  throw new Error("Duplicate fixtures require isolated loopback services.");
const sql = postgres(connection, { max: 1, ssl: false });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const call = (path, method = "GET", data, cookie, origin = base) =>
  fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie && { Cookie: cookie }),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

test("fingerprints are verified from originals, lookup saves transfers and reuse preserves live access/deletion rules", async () => {
  const signedIn = await call("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  assert.equal(signedIn.status, 200);
  const cookie = signedIn.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const jpeg = await sharp({
    create: { width: 40, height: 32, channels: 3, background: "#74916c" },
  })
    .jpeg()
    .toBuffer();
  const a = Buffer.concat([jpeg, Buffer.from(randomUUID())]);
  const b = Buffer.concat([jpeg, Buffer.from(randomUUID())]);
  const fixtureName = randomUUID() + ".jpg";
  const body = (bytes, extra = {}) => ({
    name: fixtureName,
    size: bytes.length,
    type: "image/jpeg",
    sha256: hash(bytes),
    ...extra,
  });
  const created = [];
  async function upload(bytes, extra = {}) {
    const started = await call(
      "/api/media/uploads",
      "POST",
      body(bytes, extra),
      cookie,
    );
    assert.equal(started.status, 201);
    const remote = await started.json();
    created.push(remote.id);
    assert.equal(
      (
        await fetch(remote.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: bytes,
        })
      ).status,
      200,
    );
    const complete = await call(
      "/api/media/" + remote.id + "/complete",
      "POST",
      {},
      cookie,
    );
    assert.equal(complete.status, 200);
    return remote;
  }
  try {
    assert.equal(
      (await call("/api/media/uploads", "POST", body(a))).status,
      401,
    );
    assert.equal(
      (
        await call(
          "/api/media/uploads",
          "POST",
          body(a),
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
          body(a, { sha256: "invalid" }),
          cookie,
        )
      ).status,
      400,
    );
    const first = await upload(a);
    const before =
      await sql`select count(*)::int as count from media_photos where name=${fixtureName}`;
    const duplicate = await call("/api/media/uploads", "POST", body(a), cookie);
    assert.equal(duplicate.status, 200);
    const match = await duplicate.json();
    assert.equal(match.duplicate.id, first.id);
    assert.equal(match.uploadUrl, undefined);
    assert.deepEqual(
      await sql`select count(*)::int as count from media_photos where name=${fixtureName}`,
      before,
    );
    const reused = await call(
      "/api/media/uploads",
      "POST",
      { reuseId: first.id, sha256: hash(a), size: a.length },
      cookie,
    );
    assert.deepEqual(await reused.json(), { id: first.id, reused: true });
    assert.equal(
      (await call("/api/media/" + first.id + "/display")).status,
      404,
    );
    assert.equal(
      (await call("/api/media/" + first.id + "/original")).status,
      404,
    );
    const copy = await upload(a, { forceDuplicate: true });
    assert.notEqual(copy.id, first.id);
    const claimed = "f".repeat(64);
    const different = await upload(b, { sha256: claimed });
    const [verified] =
      await sql`select original_sha256 from media_photos where id=${different.id}`;
    assert.equal(verified.original_sha256, hash(b));
    const foundB = await (
      await call("/api/media/uploads", "POST", body(b), cookie)
    ).json();
    assert.equal(foundB.duplicate.id, different.id);
    assert.equal(
      (
        await call(
          "/api/media/" + first.id,
          "DELETE",
          { confirm: true },
          cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/api/media/uploads",
          "POST",
          { reuseId: first.id, sha256: hash(a), size: a.length },
          cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (await (await call("/api/media/uploads", "POST", body(a), cookie)).json())
        .duplicate.id,
      copy.id,
    );
    // Explicitly represent an old, unindexed original without reading it.
    await sql`update media_photos set original_sha256=null where id=${different.id}`;
    const unindexed = await call("/api/media/uploads", "POST", body(b), cookie);
    assert.equal(unindexed.status, 201);
    assert.ok((await unindexed.json()).uploadUrl);
  } finally {
    for (const id of created)
      await call("/api/media/" + id, "DELETE", { confirm: true }, cookie);
    await sql.end();
  }
});
