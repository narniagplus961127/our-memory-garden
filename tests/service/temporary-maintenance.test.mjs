import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { cleanupTemporaryData } from "../../src/lib/temporary-cleanup.ts";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3013";
const secret = "local-maintenance-test-secret-32-characters";
test("scheduled cleanup preserves active data, retries failures, progresses in bounded batches and rejects unauthorized calls", async (t) => {
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  assert.equal(new URL(process.env.AWS_ENDPOINT_URL_S3).hostname, "127.0.0.1");
  assert.equal(new URL(base).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { max: 3 });
  const storage = new S3Client({
    forcePathStyle: true,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
  });
  const photos = [],
    exports = [];
  t.after(async () => {
    try {
      if (exports.length)
        await sql`delete from garden_exports where id in ${sql(exports)}`;
      if (photos.length)
        await sql`delete from media_photos where id in ${sql(photos)}`;
    } finally {
      await sql.end();
      storage.destroy();
    }
  });
  const [admin] = await sql`select user_id from garden_administrators limit 1`;
  const put = async (Bucket, Key) =>
    storage.send(
      new PutObjectCommand({
        Bucket,
        Key,
        Body: Buffer.from("preserved fixture bytes"),
      }),
    );
  const exists = async (Bucket, Key) => {
    try {
      const object = await storage.send(new GetObjectCommand({ Bucket, Key }));
      await object.Body.transformToByteArray();
      return true;
    } catch (e) {
      if (e.$metadata?.httpStatusCode === 404) return false;
      throw e;
    }
  };
  const remove = async (Bucket, Key, abortSignal) => {
    await storage.send(new DeleteObjectCommand({ Bucket, Key }), {
      abortSignal,
    });
  };
  const variantKeys = (key) =>
    [320, 640, 1280].map((width) => `${key}.w${width}.v1.webp`);
  const options = {
    apply: true,
    originalsBucket: "garden-originals",
    displayBucket: "garden-display",
    variantKeys,
  };
  async function photo(status, age) {
    const id = crypto.randomUUID();
    photos.push(id);
    await sql`insert into media_photos(id,name,status,expected_bytes,staging_key,original_key,display_key,created_by,expires_at)
      values(${id},'Maintenance fixture',${status},23,${"staging/" + id},${id + "/original"},${id + "/display.webp"},${admin.user_id},${new Date(Date.now() + age)})`;
    const keys = [
      ["garden-originals", "staging/" + id],
      ["garden-originals", id + "/original"],
      ["garden-display", id + "/display.webp"],
      ...variantKeys(id + "/display.webp").map((key) => [
        "garden-display",
        key,
      ]),
    ];
    for (const [bucket, key] of keys) await put(bucket, key);
    return { id, keys };
  }
  async function archive(expired, parts) {
    const id = crypto.randomUUID();
    exports.push(id);
    const key = `exports/${id}/manifest.json`;
    await sql`insert into garden_exports(id,created_by,filename,object_key,expires_at,status,bytes) values(${id},${admin.user_id},'maintenance-fixture',${key},${new Date(Date.now() + (expired ? -3600000 : 3600000))},'ready',23)`;
    await put("garden-originals", key);
    for (let number = 1; number <= parts; number++) {
      const partKey = `exports/${id}/part-${number}.tar`;
      await sql`insert into garden_export_parts(export_id,number,kind,status,filename,object_key) values(${id},${number},'content','ready',${"part-" + number + ".tar"},${partKey})`;
      await put("garden-originals", partKey);
    }
    return { id, key };
  }
  assert.equal((await fetch(base + "/api/maintenance")).status, 401);
  assert.equal(
    (
      await fetch(base + "/api/maintenance", {
        headers: { Authorization: "Bearer wrong" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/api/maintenance", {
        method: "HEAD",
        headers: { Authorization: "Bearer " + secret },
      })
    ).status,
    405,
  );
  assert.equal(
    (
      await fetch(base + "/api/maintenance?dryRun=invalid", {
        headers: { Authorization: "Bearer " + secret },
      })
    ).status,
    400,
  );
  const expired = await photo("pending", -7200000),
    fresh = await photo("pending", 900000),
    ready = await photo("ready", -7200000);
  const old = await archive(true, 55),
    active = await archive(false, 1);
  const dry = await fetch(base + "/api/maintenance?dryRun=1", {
    headers: { Authorization: "Bearer " + secret },
  });
  assert.equal(dry.status, 200);
  assert.equal((await dry.json()).mode, "dry-run");
  assert.equal(await exists("garden-originals", old.key), true);
  assert.equal(await exists("garden-originals", "staging/" + expired.id), true);
  const first = await fetch(base + "/api/maintenance", {
    headers: { Authorization: "Bearer " + secret },
  });
  assert.equal(first.status, 200);
  const result = await first.json();
  assert.equal(result.deferred, true);
  const [remaining] =
    await sql`select count(*)::int as count from garden_export_parts where export_id=${old.id}`;
  assert.equal(remaining.count, 5);
  for (const [bucket, key] of expired.keys)
    assert.equal(await exists(bucket, key), false, key);
  for (const item of [fresh, ready])
    for (const [bucket, key] of item.keys)
      assert.equal(await exists(bucket, key), true, key);
  assert.equal(await exists("garden-originals", active.key), true);
  const second = await fetch(base + "/api/maintenance", {
    headers: { Authorization: "Bearer " + secret },
  });
  assert.equal(second.status, 200);
  assert.equal(await exists("garden-originals", old.key), false);
  const [done] =
    await sql`select cleaned_at from garden_exports where id=${old.id}`;
  assert.ok(done.cleaned_at);
  const failed = await photo("pending", -7200000);
  const partial = await cleanupTemporaryData(
    sql,
    async (bucket, key, signal) => {
      if (key === failed.id + "/display.webp")
        throw Error("Injected storage failure");
      await remove(bucket, key, signal);
    },
    { ...options, kind: "staging" },
  );
  assert.ok(partial.staging.failed);
  const [retryable] =
    await sql`select staging_cleaned_at from media_photos where id=${failed.id}`;
  assert.equal(retryable.staging_cleaned_at, null);
  await cleanupTemporaryData(sql, remove, { ...options, kind: "staging" });
  for (const [bucket, key] of failed.keys)
    assert.equal(await exists(bucket, key), false);
  const unsafe = await photo("pending", -7200000);
  await sql`update media_photos set staging_key=${ready.id + "/original"} where id=${unsafe.id}`;
  const rejected = await cleanupTemporaryData(sql, remove, {
    ...options,
    kind: "staging",
  });
  assert.ok(rejected.staging.failed);
  assert.equal(await exists("garden-originals", ready.id + "/original"), true);
  await sql`update media_photos set staging_key=${"staging/" + unsafe.id} where id=${unsafe.id}`;
  await cleanupTemporaryData(sql, remove, { ...options, kind: "staging" });
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let acquired;
  const locked = new Promise((resolve) => {
    acquired = resolve;
  });
  const holder = sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(7421901)`;
    acquired();
    await gate;
  });
  await locked;
  try {
    const overlap = await cleanupTemporaryData(
      sql,
      async () => {
        throw Error("Must not delete during overlap");
      },
      options,
    );
    assert.equal(overlap.overlap, true);
  } finally {
    release();
    await holder;
  }
  const deferred = await cleanupTemporaryData(
    sql,
    async () => {
      throw Error("Must not delete after deadline");
    },
    { ...options, deadline: Date.now() - 1 },
  );
  assert.equal(deferred.deferred, true);
});
