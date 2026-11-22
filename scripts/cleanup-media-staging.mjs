import postgres from "postgres";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { photoVariantWidths } from "../src/lib/media.ts";
import { photoVariantKey } from "../src/lib/server/photo-variants.ts";
import { cleanupTemporaryData } from "../src/lib/temporary-cleanup.ts";
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--apply"))
  throw Error("Use no arguments for dry-run, or --apply.");
const connection = process.env.DATABASE_URL;
if (!connection) throw Error("DATABASE_URL is required.");
const sql = postgres(connection, {
  max: 1,
  prepare: false,
  ssl: new URL(connection).hostname === "127.0.0.1" ? false : "require",
});
const storage = new S3Client({
  forcePathStyle: true,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || "ap-southeast-1",
  requestChecksumCalculation: "WHEN_REQUIRED",
});
try {
  if (args.includes("--apply") && !process.env.AWS_ENDPOINT_URL_S3)
    throw Error("AWS_ENDPOINT_URL_S3 is required for --apply.");
  const result = await cleanupTemporaryData(
    sql,
    async (Bucket, Key, abortSignal) => {
      await storage.send(new DeleteObjectCommand({ Bucket, Key }), {
        abortSignal,
      });
    },
    {
      apply: args.includes("--apply"),
      kind: "staging",
      originalsBucket:
        process.env.MEDIA_ORIGINALS_BUCKET ||
        process.env.GARDEN_ORIGINALS_BUCKET ||
        "garden-originals",
      displayBucket:
        process.env.MEDIA_DISPLAY_BUCKET ||
        process.env.GARDEN_DISPLAY_BUCKET ||
        "garden-display",
      variantKeys: (key) =>
        photoVariantWidths.map((width) => photoVariantKey(key, width)),
    },
  );
  console.log(
    JSON.stringify({
      mode: result.mode,
      limit: 100,
      graceMinutes: 60,
      count: result.staging.examined,
      cleaned: result.staging.cleaned,
      failed: result.staging.failed,
      overlap: result.overlap,
      deferred: result.deferred,
      uploadIds: result.staging.uploadIds,
    }),
  );
  if (result.staging.failed || result.overlap || result.deferred)
    process.exitCode = 1;
} finally {
  await sql.end();
  storage.destroy();
}
