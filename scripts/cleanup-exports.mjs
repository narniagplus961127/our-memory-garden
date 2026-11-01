import postgres from "postgres";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
const apply = process.argv.includes("--apply"),
  target = process.argv
    .find((value) => value.startsWith("--export-id="))
    ?.slice(12);
if (target && !/^[\da-f-]{36}$/i.test(target))
  throw new Error("Use a valid export ID.");
const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL is required.");
const sql = postgres(connection, {
  max: 1,
  ssl: new URL(connection).hostname === "127.0.0.1" ? false : "require",
});
const s3 = new S3Client({
  forcePathStyle: true,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || "ap-southeast-1",
  requestChecksumCalculation: "WHEN_REQUIRED",
});
const Bucket =
  process.env.MEDIA_ORIGINALS_BUCKET ||
  process.env.GARDEN_ORIGINALS_BUCKET ||
  "garden-originals";
try {
  await sql.begin(async (tx) => {
    const jobs =
      await tx`select id,object_key from garden_exports where expires_at<=now() and cleaned_at is null and (${target ?? null}::uuid is null or id=${target ?? null}::uuid) order by expires_at limit 10 for update skip locked`;
    for (const job of jobs) {
      const parts =
        await tx`select object_key from garden_export_parts where export_id=${job.id}`;
      console.log(
        JSON.stringify({
          id: job.id,
          keys: parts.length + 1,
          action: apply ? "clean" : "dry-run",
        }),
      );
      if (!apply) continue;
      // Release expired pins and private snapshot rows even if object cleanup needs a retry.
      await tx`delete from garden_export_items where export_id=${job.id}`;
      await tx`delete from garden_export_records where export_id=${job.id}`;
      let failed = false;
      for (const key of new Set([
        job.object_key,
        ...parts.map((p) => p.object_key),
      ])) {
        if (
          !new RegExp(
            "^exports/" +
              job.id.replaceAll("-", "\\-") +
              "(?:/[^/]+\\.(?:tar|json)|\\.tar)$",
          ).test(key)
        ) {
          failed = true;
          continue;
        }
        try {
          await s3.send(new DeleteObjectCommand({ Bucket, Key: key }), {
            abortSignal: AbortSignal.timeout(30000),
          });
        } catch {
          failed = true;
        }
      }
      await tx`update garden_exports set status='error',error=${failed ? "Expired export cleanup is incomplete; run maintenance again." : "This export expired. Create a fresh export."},cleaned_at=${failed ? null : new Date()} where id=${job.id}`;
      if (failed) process.exitCode = 1;
    }
  });
} finally {
  await sql.end();
  s3.destroy();
}
