import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";
import sharp from "sharp";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const base = process.env.TEST_BASE_URL;
const execute = promisify(execFile);
test("staging cleanup is dry-run by default, expires only old pending staging and preserves ready photos", async () => {
  if (new URL(process.env.DATABASE_URL).hostname !== "127.0.0.1")
    throw new Error("Fixture is restricted to the local database.");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const client = new S3Client({
    forcePathStyle: true,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
  });
  try {
    const response = await fetch(base + "/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    const bytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#aabbcc" },
    })
      .png()
      .toBuffer();
    async function upload(name) {
      const start = await fetch(base + "/api/media/uploads", {
        method: "POST",
        headers: {
          Origin: base,
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, size: bytes.length, type: "image/png" }),
      });
      assert.equal(start.status, 201);
      const item = await start.json();
      assert.equal(
        (
          await fetch(item.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/png" },
            body: bytes,
          })
        ).status,
        200,
      );
      return item;
    }
    const expired = await upload("cleanup-expired.png"),
      fresh = await upload("cleanup-fresh.png"),
      ready = await upload("cleanup-ready.png");
    assert.equal(
      (
        await fetch(base + "/api/media/" + ready.id + "/complete", {
          method: "POST",
          headers: { Origin: base, Cookie: cookie },
        })
      ).status,
      200,
    );
    await sql`update media_photos set expires_at=now()-interval '2 hours' where id in (${expired.id},${ready.id})`;
    const dry = JSON.parse(
      (await execute(process.execPath, ["scripts/cleanup-media-staging.mjs"]))
        .stdout,
    );
    assert.equal(dry.mode, "dry-run");
    assert.ok(dry.uploadIds.includes(expired.id));
    assert.ok(!dry.uploadIds.includes(fresh.id));
    assert.ok(!dry.uploadIds.includes(ready.id));
    const key = new URL(expired.uploadUrl).pathname
      .split("/")
      .slice(2)
      .join("/");
    assert.deepEqual(
      Buffer.from(
        await (
          await client.send(
            new GetObjectCommand({ Bucket: "garden-originals", Key: key }),
          )
        ).Body.transformToByteArray(),
      ),
      bytes,
    );
    const applied = JSON.parse(
      (
        await execute(process.execPath, [
          "scripts/cleanup-media-staging.mjs",
          "--apply",
        ])
      ).stdout,
    );
    assert.equal(applied.mode, "apply");
    assert.ok(applied.uploadIds.includes(expired.id));
    await assert.rejects(
      client.send(
        new GetObjectCommand({ Bucket: "garden-originals", Key: key }),
      ),
      (error) => error.$metadata.httpStatusCode === 404,
    );
    for (const kind of ["original", "display"])
      assert.equal(
        (
          await fetch(base + "/api/media/" + ready.id + "/" + kind, {
            headers: { Cookie: cookie },
          })
        ).status,
        200,
      );
    const again = JSON.parse(
      (await execute(process.execPath, ["scripts/cleanup-media-staging.mjs"]))
        .stdout,
    );
    assert.ok(!again.uploadIds.includes(expired.id));
  } finally {
    await sql.end();
    client.destroy();
  }
});
