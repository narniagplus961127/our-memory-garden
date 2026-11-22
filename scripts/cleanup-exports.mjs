import postgres from "postgres";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { cleanupTemporaryData } from "../src/lib/temporary-cleanup.ts";
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--apply" && !arg.startsWith("--export-id=")))
  throw Error("Use --apply and/or --export-id=<uuid>.");
const target = args.find((arg) => arg.startsWith("--export-id="))?.slice(12);
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
      kind: "exports",
      exportId: target,
      originalsBucket:
        process.env.MEDIA_ORIGINALS_BUCKET ||
        process.env.GARDEN_ORIGINALS_BUCKET ||
        "garden-originals",
      displayBucket: "garden-display",
      variantKeys: () => [],
    },
  );
  for (const job of result.exports.jobs) console.log(JSON.stringify(job));
  if (result.exports.failed || result.overlap || result.deferred)
    process.exitCode = 1;
} finally {
  await sql.end();
  storage.destroy();
}
