import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
const base = process.env.TEST_BASE_URL;
export async function call(path, method = "GET", data, cookie) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
export async function login(prefix = "ADMIN") {
  const r = await call("/api/auth/sign-in/email", "POST", {
    email: process.env["TEST_" + prefix + "_EMAIL"],
    password: process.env["TEST_" + prefix + "_PASSWORD"],
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
}
export async function photo(cookie, name = "backup-flower.png", suppliedBytes) {
  const bytes =
    suppliedBytes ??
    (await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#769270" },
    })
      .png()
      .toBuffer());
  const upload = await (
    await call(
      "/api/media/uploads",
      "POST",
      { name, size: bytes.length, type: "image/png" },
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
  const r = await call(
    "/api/media/" + upload.id + "/complete",
    "POST",
    {},
    cookie,
  );
  assert.equal(r.status, 200);
  return { ...(await r.json()), bytes };
}
test("unused photos require confirmation and disappear only after successful deletion", async () => {
  const cookie = await login();
  const p = await photo(cookie);
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true })).status,
    401,
  );
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", {}, cookie)).status,
    400,
  );
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/media/" + p.id, "GET", undefined, cookie)).status,
    404,
  );
});
test("a referenced photo cannot be deleted and concurrent save versus delete never leaves a broken page", async () => {
  const cookie = await login();
  for (let round = 0; round < 3; round++) {
    const p = await photo(cookie, "race-flower.png");
    const page = await (
      await call("/api/pages", "POST", { title: "Shared flower" }, cookie)
    ).json();
    const content = {
      root: { props: {} },
      content: [
        {
          type: "Gallery",
          props: {
            id: "race-gallery",
            photos: [{ photoId: p.id, caption: "Our flower" }],
          },
        },
      ],
    };
    const save = () =>
      call(
        "/api/pages/" + page.id,
        "PATCH",
        { title: page.title, version: page.version, content },
        cookie,
      );
    if (round === 0) {
      assert.equal((await save()).status, 200);
      assert.equal(
        (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
          .status,
        409,
      );
      const details = await (
        await call("/api/media/" + p.id, "GET", undefined, cookie)
      ).json();
      assert.ok(details.usages.some((u) => u.id === page.id));
    } else {
      const [saved, deleted] = await Promise.all([
        save(),
        call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie),
      ]);
      if (saved.status === 200) {
        assert.equal(deleted.status, 409);
        assert.equal(
          (
            await call(
              "/api/media/" + p.id + "/original",
              "GET",
              undefined,
              cookie,
            )
          ).status,
          200,
        );
      } else {
        assert.equal(deleted.status, 200);
        assert.ok([400, 409].includes(saved.status));
      }
    }
  }
});
test("partial storage deletion retains a guarded unfinished operation and retry finishes cleanup", async () => {
  const cookie = await login();
  const p = await photo(cookie, "partial-cleanup.png");
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  assert.equal(
    (
      await fetch(endpoint + "/__fixture/fail-display-delete", {
        method: "PUT",
      })
    ).status,
    204,
  );
  try {
    assert.equal(
      (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
        .status,
      503,
    );
    const details = await (
      await call("/api/media/" + p.id, "GET", undefined, cookie)
    ).json();
    assert.equal(details.deletionPending, true);
    assert.equal(
      (await call("/api/media/" + p.id + "/complete", "POST", {}, cookie))
        .status,
      409,
    );
    assert.match(details.deletionError, /incomplete/i);
    assert.equal(
      (await call("/api/media/" + p.id + "/original", "GET", undefined, cookie))
        .status,
      404,
    );
    const page = await (
      await call("/api/pages", "POST", { title: "No partial photos" }, cookie)
    ).json();
    assert.equal(
      (
        await call(
          "/api/pages/" + page.id,
          "PATCH",
          {
            title: page.title,
            version: page.version,
            content: {
              root: { props: {} },
              content: [
                {
                  type: "Image",
                  props: {
                    id: "pending-deletion",
                    photoId: p.id,
                    alt: "Unavailable",
                  },
                },
              ],
            },
          },
          cookie,
        )
      ).status,
      400,
    );
  } finally {
    await fetch(endpoint + "/__fixture/fail-display-delete", {
      method: "DELETE",
    });
  }
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/media/" + p.id, "GET", undefined, cookie)).status,
    404,
  );
});
test("storage reports measured object categories, physical database bytes, sources and freshness without invented quotas", async () => {
  assert.equal((await call("/api/storage")).status, 401);
  const cookie = await login();
  const before = Date.now();
  const response = await call("/api/storage", "GET", undefined, cookie);
  assert.equal(response.status, 200);
  const usage = await response.json();
  assert.ok(usage.total > 0);
  assert.equal(
    usage.total,
    usage.originals + usage.display + usage.archives + usage.staging,
  );
  assert.ok(usage.databaseBytes > 0);
  assert.match(usage.databaseSource, /pg_database_size/);
  assert.match(usage.source, /bucket listing/);
  assert.ok(new Date(usage.measuredAt).getTime() >= before);
  assert.equal(usage.quota, null);
  assert.equal(usage.plan, null);
});
test("a genuine non-administrator session cannot inspect exports/storage or delete shared photos", async () => {
  const { betterAuth } = await import("better-auth");
  const { localAuthOptions } =
    await import("../../src/lib/server/local-auth.ts");
  const options = localAuthOptions();
  try {
    const r = await betterAuth(options).api.signInEmail({
      body: {
        email: process.env.TEST_OUTSIDER_EMAIL,
        password: process.env.TEST_OUTSIDER_PASSWORD,
      },
      asResponse: true,
    });
    assert.equal(r.status, 200);
    const cookie = r.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    assert.equal(
      (await call("/api/exports", "GET", undefined, cookie)).status,
      401,
    );
    assert.equal((await call("/api/exports", "POST", {}, cookie)).status, 401);
    assert.equal(
      (await call("/api/storage", "GET", undefined, cookie)).status,
      401,
    );
    assert.equal(
      (
        await call(
          "/api/media/" + crypto.randomUUID(),
          "DELETE",
          { confirm: true },
          cookie,
        )
      ).status,
      401,
    );
  } finally {
    await options.database.end();
  }
});
const partPath = (job, part) =>
  "/api/exports/" + job.id + "/parts/" + part.id + "/download";
async function freshExport(cookie) {
  const existing = await (
    await call("/api/exports", "GET", undefined, cookie)
  ).json();
  if (existing && !existing.expired && existing.status !== "ready")
    await call(
      "/api/exports/" + existing.id,
      "DELETE",
      { confirm: true },
      cookie,
    );
  const response = await call("/api/exports", "POST", {}, cookie);
  assert.equal(response.status, 202);
  return response.json();
}
async function prepare(cookie, job) {
  for (let i = 0; i < 1000 && job.status !== "ready"; i++) {
    const response = await call(
      "/api/exports/" + job.id + "/prepare",
      "POST",
      {},
      cookie,
    );
    assert.equal(response.status, 200, await response.clone().text());
    job = await response.json();
    if (job.status === "error") break;
  }
  return job;
}
async function backup(cookie, job) {
  const response = await call(
    "/api/exports/" + job.id + "/manifest",
    "GET",
    undefined,
    cookie,
  );
  assert.equal(response.status, 200);
  const manifest = await response.json(),
    files = new Map();
  const directory = await mkdtemp(resolve("work", "backup-test-"));
  try {
    for (const part of job.parts) {
      const response = await call(
        partPath(job, part),
        "GET",
        undefined,
        cookie,
      );
      assert.equal(response.status, 200);
      const archive = Buffer.from(await response.arrayBuffer());
      const listing = spawnSync("tar", ["-tf", "-"], { input: archive });
      assert.equal(listing.status, 0, listing.stderr.toString());
      for (const path of listing.stdout.toString().trim().split(/\r?\n/))
        assert.ok(!path.startsWith("/") && !path.includes(".."));
      const extracted = spawnSync("tar", ["-xf", "-", "-C", directory], {
        input: archive,
      });
      assert.equal(extracted.status, 0, extracted.stderr.toString());
    }
    for (const record of manifest.inventory) {
      files.set(record.path, await readFile(join(directory, record.path)));
      if (record.photo)
        files.set(
          record.photo.file,
          await readFile(join(directory, record.photo.file)),
        );
    }
    return { manifest, files };
  } finally {
    if (
      resolve(directory).startsWith(resolve("work") + "/") ||
      resolve(directory).startsWith(resolve("work") + "\\")
    )
      await rm(directory, { recursive: true, force: true });
  }
}
test("multipart backup covers the complete consistent collection, resumes after reload, and protects authenticated ranged parts", async () => {
  const cookie = await login();
  const noisy = await sharp(randomBytes(1300 * 1300 * 3), {
    raw: { width: 1300, height: 1300, channels: 3 },
  })
    .png()
    .toBuffer();
  const first = await photo(cookie, "large-original-one.png", noisy),
    second = await photo(cookie, "large-original-two.png", noisy);
  const page = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Private complete backup" },
      cookie,
    )
  ).json();
  assert.equal((await call("/api/exports", "POST", {})).status, 401);
  let job = await freshExport(cookie);
  assert.equal(job.status, "pending");
  assert.ok(
    job.parts.filter((p) => p.kind === "originals").length >= 2,
    "Loopback threshold must force multiple original parts",
  );
  assert.equal(
    (await call("/api/media/" + first.id, "DELETE", { confirm: true }, cookie))
      .status,
    409,
  );
  const startedId = job.id;
  job = await (
    await call("/api/exports/" + job.id + "/prepare", "POST", {}, cookie)
  ).json();
  assert.ok(job.parts.some((p) => p.status === "ready"));
  assert.equal(job.status, "pending");
  const reloaded = await (
    await call("/api/exports/" + startedId, "GET", undefined, cookie)
  ).json();
  assert.equal(
    reloaded.parts.filter((p) => p.status === "ready").length,
    job.parts.filter((p) => p.status === "ready").length,
  );
  const changed = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { version: page.version, title: "Edited after snapshot" },
    cookie,
  );
  assert.equal(changed.status, 200);
  job = await prepare(cookie, reloaded);
  assert.equal(job.status, "ready", JSON.stringify(job));
  const { manifest, files } = await backup(cookie, job);
  assert.equal(manifest.format, "our-memory-garden/v2");
  assert.equal(manifest.complete, true);
  for (const p of [first, second])
    assert.deepEqual(files.get("originals/" + p.id + ".png"), p.bytes);
  const pages = manifest.inventory
    .filter((r) => r.kind === "pages")
    .map((r) => JSON.parse(files.get(r.path).toString()));
  assert.ok(
    pages.some(
      (value) =>
        value.id === page.id &&
        value.title === "Private complete backup" &&
        value.visibility === "private",
    ),
  );
  assert.equal(
    (await call("/api/exports/" + job.id + "/manifest")).status,
    401,
  );
  const part = job.parts.find((p) => p.kind === "originals");
  assert.equal((await call(partPath(job, part))).status, 401);
  const full = await call(partPath(job, part), "GET", undefined, cookie);
  assert.match(full.headers.get("cache-control"), /no-store/);
  const archive = Buffer.from(await full.arrayBuffer());
  assert.ok(archive.length > 4.5 * 1024 * 1024);
  const range = await fetch(base + partPath(job, part), {
    headers: { Cookie: cookie, Range: "bytes=0-511" },
  });
  assert.equal(range.status, 206);
  assert.deepEqual(
    Buffer.from(await range.arrayBuffer()),
    archive.subarray(0, 512),
  );
  assert.equal(
    (await call("/api/media/" + first.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
    "Archived originals release their pin",
  );
});
test("failed parts remain retryable in the same snapshot and expired parts/manifest are denied", async () => {
  const cookie = await login(),
    p = await photo(cookie, "resume-original.png");
  let job = await freshExport(cookie);
  const { S3Client, DeleteObjectCommand, PutObjectCommand } =
    await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    forcePathStyle: true,
  });
  const Bucket = process.env.MEDIA_ORIGINALS_BUCKET || "garden-originals",
    Key = p.id + "/original";
  await s3.send(new DeleteObjectCommand({ Bucket, Key }));
  try {
    job = await prepare(cookie, job);
    assert.equal(job.status, "error");
    assert.ok(job.parts.some((p) => p.status === "error"));
    assert.equal(
      (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
        .status,
      409,
    );
  } finally {
    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key,
        Body: p.bytes,
        ContentType: "image/png",
      }),
    );
    s3.destroy();
  }
  const sameId = job.id;
  job = await prepare(cookie, job);
  assert.equal(job.id, sameId);
  assert.equal(job.status, "ready");
  const postgres = (await import("postgres")).default;
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { ssl: false, max: 1 });
  try {
    await sql`update garden_exports set expires_at=now()-interval '1 second' where id=${job.id}`;
  } finally {
    await sql.end();
  }
  assert.equal(
    (await call(partPath(job, job.parts[0]), "GET", undefined, cookie)).status,
    410,
  );
  assert.equal(
    (
      await call(
        "/api/exports/" + job.id + "/manifest",
        "GET",
        undefined,
        cookie,
      )
    ).status,
    410,
  );
  assert.match(
    (
      await (
        await call("/api/exports/" + job.id, "GET", undefined, cookie)
      ).json()
    ).error,
    /expired/i,
  );
});
test("history-only photos are deletable after removal without deleting the page or granting public access", async () => {
  const cookie = await login(),
    p = await photo(cookie, "historical-flower.png");
  let page = await (
    await call("/api/pages", "POST", { title: "Retained photo story" }, cookie)
  ).json();
  let response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    {
      title: page.title,
      version: page.version,
      visibility: "public",
      content: {
        root: { props: {} },
        content: [
          {
            type: "Image",
            props: {
              id: "history-image",
              photoId: p.id,
              alt: "Retained flower",
            },
          },
        ],
      },
    },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  const photoVersion = page.version;
  response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { title: page.title + " revised", version: page.version },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  assert.equal(
    (await (await call("/api/media/" + p.id, "GET", undefined, cookie)).json())
      .usages.length,
    1,
  );
  assert.equal(
    (
      await call(
        "/api/pages/" + page.id,
        "PATCH",
        {
          title: page.title,
          version: page.version,
          content: { root: { props: {} }, content: [] },
        },
        cookie,
      )
    ).status,
    200,
  );
  const details = await (
    await call("/api/media/" + p.id, "GET", undefined, cookie)
  ).json();
  assert.equal(details.usages.length, 0);
  assert.equal(details.publiclyAccessible, false);
  assert.equal((await call("/api/media/" + p.id + "/display")).status, 404);
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/media/" + p.id + "/original", "GET", undefined, cookie))
      .status,
    404,
  );
  const before = await (
    await call("/api/pages/" + page.id, "GET", undefined, cookie)
  ).json();
  assert.equal(
    (
      await call(
        "/api/pages/" + page.id + "/history/" + photoVersion,
        "POST",
        { confirm: true, version: before.version },
        cookie,
      )
    ).status,
    409,
  );
  assert.deepEqual(
    (
      await (
        await call("/api/pages/" + page.id, "GET", undefined, cookie)
      ).json()
    ).content,
    before.content,
  );
  const job = await prepare(cookie, await freshExport(cookie));
  assert.equal(job.status, "ready");
  const { manifest, files } = await backup(cookie, job);
  assert.ok(
    manifest.inventory
      .filter((r) => r.kind === "page_versions")
      .some((record) => {
        const version = JSON.parse(files.get(record.path).toString());
        return (
          version.page_id === page.id &&
          JSON.stringify(version.snapshot).includes(p.id)
        );
      }),
  );
});
test("cancellation releases unprepared photo pins and explicit expiry maintenance removes stored parts and snapshot records", async () => {
  const cookie = await login(),
    p = await photo(cookie, "cleanup-reservation.png");
  let job = await freshExport(cookie);
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    409,
  );
  job = await (
    await call("/api/exports/" + job.id + "/prepare", "POST", {}, cookie)
  ).json();
  const ready = job.parts.find((part) => part.status === "ready");
  assert.ok(ready);
  const canceled = await call(
    "/api/exports/" + job.id,
    "DELETE",
    { confirm: true },
    cookie,
  );
  assert.equal(canceled.status, 200);
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
  const dry = spawnSync(
    process.execPath,
    [
      "--env-file=.env.test",
      "scripts/cleanup-exports.mjs",
      "--export-id=" + job.id,
    ],
    { encoding: "utf8" },
  );
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /dry-run/);
  const postgres = (await import("postgres")).default;
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { ssl: false, max: 1 });
  const { S3Client, HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    forcePathStyle: true,
  });
  try {
    const [part] =
      await sql`select object_key from garden_export_parts where id=${ready.id}`;
    assert.equal(
      (
        await s3.send(
          new HeadObjectCommand({
            Bucket: process.env.MEDIA_ORIGINALS_BUCKET || "garden-originals",
            Key: part.object_key,
          }),
        )
      ).ContentLength > 0,
      true,
    );
    const apply = spawnSync(
      process.execPath,
      [
        "--env-file=.env.test",
        "scripts/cleanup-exports.mjs",
        "--export-id=" + job.id,
        "--apply",
      ],
      { encoding: "utf8" },
    );
    assert.equal(apply.status, 0, apply.stderr);
    assert.match(apply.stdout, /clean/);
    await assert.rejects(
      s3.send(
        new HeadObjectCommand({
          Bucket: process.env.MEDIA_ORIGINALS_BUCKET || "garden-originals",
          Key: part.object_key,
        }),
      ),
      (error) => error.$metadata.httpStatusCode === 404,
    );
    const [records] =
      await sql`select count(*)::int as count from garden_export_records where export_id=${job.id}`;
    const [pins] =
      await sql`select count(*)::int as count from garden_export_items where export_id=${job.id}`;
    assert.equal(records.count, 0);
    assert.equal(pins.count, 0);
    const [cleaned] =
      await sql`select cleaned_at from garden_exports where id=${job.id}`;
    assert.ok(cleaned.cleaned_at);
  } finally {
    await sql.end();
    s3.destroy();
  }
});
test("cover/date/category records and exact scanner keys survive the consistent export snapshot", async () => {
  const cookie = await login(),
    cover = await photo(cookie, "category-cover.png"),
    sharing = await photo(cookie, "sharing-backup-cover.png");
  const categoryResponse = await call(
    "/api/categories",
    "POST",
    { name: "Backup category " + Date.now() },
    cookie,
  );
  assert.equal(categoryResponse.status, 201);
  const category = await categoryResponse.json();
  let page = await (
    await call("/api/pages", "POST", { title: "Organized backup page" }, cookie)
  ).json();
  let details = await call(
    "/api/pages/" + page.id + "/details",
    "PATCH",
    {
      metadataVersion: page.metadata_version,
      date: "2026-11-01",
      categoryId: category.id,
      coverPhotoId: cover.id,
      sharingCoverPhotoId: sharing.id,
      sharingTitle: "Sharing snapshot",
      sharingDescription: "Sharing snapshot description",
      allowIndexing: false,
    },
    cookie,
  );
  assert.equal(details.status, 200);
  page = await details.json();
  let saved = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { version: page.version, visibility: "public" },
    cookie,
  );
  assert.equal(saved.status, 200);
  page = await saved.json();
  assert.equal((await call("/api/media/" + cover.id + "/display")).status, 200);
  assert.equal(
    (await call("/api/media/" + sharing.id + "/display")).status,
    200,
  );
  const job = await freshExport(cookie);
  details = await call(
    "/api/pages/" + page.id + "/details",
    "PATCH",
    {
      metadataVersion: page.metadata_version,
      date: null,
      categoryId: null,
      coverPhotoId: null,
      sharingCoverPhotoId: null,
      sharingTitle: "Later title",
      sharingDescription: "Later description",
      allowIndexing: true,
    },
    cookie,
  );
  assert.equal(details.status, 200);
  assert.equal(
    (await call("/api/media/" + sharing.id + "/display")).status,
    404,
  );
  assert.equal(
    (
      await call(
        "/api/media/" + sharing.id,
        "DELETE",
        { confirm: true },
        cookie,
      )
    ).status,
    409,
  );
  assert.equal((await call("/api/media/" + cover.id + "/display")).status, 404);
  assert.equal(
    (await call("/api/media/" + cover.id, "DELETE", { confirm: true }, cookie))
      .status,
    409,
  );
  const ready = await prepare(cookie, job);
  assert.equal(ready.status, "ready");
  const { manifest, files } = await backup(cookie, ready);
  const records = manifest.inventory.map((record) => ({
    kind: record.kind,
    value: JSON.parse(files.get(record.path).toString()),
  }));
  const backupPage = records.find(
    (record) => record.kind === "pages" && record.value.id === page.id,
  ).value;
  assert.equal(backupPage.cover_photo_id, cover.id);
  assert.equal(backupPage.sharing_cover_photo_id, sharing.id);
  assert.equal(backupPage.sharing_title, "Sharing snapshot");
  assert.equal(backupPage.sharing_description, "Sharing snapshot description");
  assert.equal(backupPage.allow_indexing, false);
  assert.equal(backupPage.category_id, category.id);
  assert.equal(backupPage.page_date, "2026-11-01");
  assert.ok(
    records.some(
      (record) =>
        record.kind === "page_categories" &&
        record.value.id === category.id &&
        record.value.name === category.name,
    ),
  );
  const postgres = (await import("postgres")).default;
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { ssl: false, max: 1 });
  try {
    for (const key of [
      "photoId",
      "coverPhotoId",
      "sharingCoverPhotoId",
      "cover_photo_id",
      "sharing_cover_photo_id",
    ]) {
      const rows =
        await sql`select garden_photo_ids(${sql.json({ [key]: cover.id })}) as id`;
      assert.deepEqual(
        rows.map((row) => row.id),
        [cover.id],
      );
    }
    assert.equal(
      (
        await sql`select garden_photo_ids(${sql.json({ unrelated_cover: cover.id })}) as id`
      ).length,
      0,
    );
  } finally {
    await sql.end();
  }
});
test("history can restore available photos while current trash references still protect them", async () => {
  const cookie = await login(),
    p = await photo(cookie, "restorable-byte-retention.png");
  let page = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Retained recovery photograph" },
      cookie,
    )
  ).json();
  let response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    {
      version: page.version,
      visibility: "public",
      content: {
        root: { props: {} },
        content: [
          {
            type: "Image",
            props: {
              id: "recovery-photo",
              photoId: p.id,
              alt: "Recoverable photo",
            },
          },
        ],
      },
    },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  const photoVersion = page.version;
  response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { version: page.version, content: { root: { props: {} }, content: [] } },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  assert.deepEqual(
    (await (await call("/api/media/" + p.id, "GET", undefined, cookie)).json())
      .usages,
    [],
  );
  response = await call(
    "/api/pages/" + page.id + "/history/" + photoVersion,
    "POST",
    { confirm: true, version: page.version },
    cookie,
  );
  assert.equal(response.status, 200, await response.clone().text());
  page = await response.json();
  assert.equal(page.visibility, "public");
  assert.equal((await call("/api/media/" + p.id + "/display")).status, 200);
  async function change(action) {
    const response = await call(
      "/api/pages/" + page.id + "/trash",
      "POST",
      { confirm: true, action, version: page.version },
      cookie,
    );
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  }
  page = await change("trash");
  assert.equal((await call("/api/media/" + p.id + "/display")).status, 404);
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    409,
  );
  page = await change("restore");
  assert.equal(page.visibility, "private");
  assert.equal((await call("/api/media/" + p.id + "/display")).status, 404);
  const original = await call(
    "/api/media/" + p.id + "/original",
    "GET",
    undefined,
    cookie,
  );
  assert.equal(original.status, 200);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), p.bytes);
  page = await change("trash");
  await change("delete");
  const details = await (
    await call("/api/media/" + p.id, "GET", undefined, cookie)
  ).json();
  assert.deepEqual(details.usages, []);
  assert.equal(
    (await call("/api/media/" + p.id + "/original", "GET", undefined, cookie))
      .status,
    200,
    "Permanent page deletion does not delete media automatically",
  );
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
});

test("retry during failed archive cleanup leaves a downloadable exact independent backup", async () => {
  const cookie = await login(),
    other = await login("OTHER"),
    original = await photo(cookie, "cleanup-race-original.png");
  let job = await freshExport(cookie);
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  assert.equal(new URL(endpoint).hostname, "127.0.0.1");
  assert.equal(
    (
      await fetch(endpoint + "/__fixture/archive-cleanup-race", {
        method: "PUT",
      })
    ).status,
    200,
  );
  const first = call("/api/exports/" + job.id + "/prepare", "POST", {}, cookie);
  try {
    await assertHeld();
    const retry = await call(
      "/api/exports/" + job.id + "/prepare",
      "POST",
      {},
      other,
    );
    assert.equal(retry.status, 200);
    await retry.json();
  } finally {
    await fetch(endpoint + "/__fixture/archive-cleanup-race", {
      method: "DELETE",
    });
    assert.equal((await first).status, 200);
  }
  job = await prepare(cookie, job);
  assert.equal(job.status, "ready");
  const { manifest, files } = await backup(cookie, job);
  assert.equal(manifest.complete, true);
  const record = manifest.inventory.find(
    (record) => record.photo?.id === original.id,
  );
  assert.ok(record);
  assert.deepEqual(files.get(record.photo.file), original.bytes);

  async function assertHeld() {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const state = await (
        await fetch(endpoint + "/__fixture/archive-cleanup-race")
      ).json();
      if (state.held) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail(
      "failed archive cleanup did not reach the controlled storage gate",
    );
  }
});
