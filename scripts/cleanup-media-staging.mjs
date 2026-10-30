import postgres from "postgres";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--apply"))
  throw new Error(
    "Use no arguments for dry-run, or --apply to remove eligible staging objects.",
  );
const apply = args.includes("--apply");
const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL is required.");
const sql = postgres(connection, {
  max: 1,
  prepare: false,
  ssl: ["127.0.0.1", "localhost"].includes(new URL(connection).hostname)
    ? false
    : "require",
});
const storage = new S3Client({
  forcePathStyle: true,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || "ap-southeast-1",
});
const stagingPattern =
  /^staging\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
try {
  const result = await sql.begin(async (transaction) => {
    const rows =
      await transaction`select id,staging_key from media_photos where status='pending' and expires_at<now()-interval '1 hour' and staging_cleaned_at is null order by expires_at,id limit 100 for update skip locked`;
    // Validate the complete batch before deleting anything. Keys never come from CLI input.
    if (rows.some((row) => !stagingPattern.test(row.staging_key)))
      throw new Error("Unexpected staging key; nothing was removed.");
    if (apply) {
      if (!process.env.AWS_ENDPOINT_URL_S3)
        throw new Error("AWS_ENDPOINT_URL_S3 is required for --apply.");
      for (const row of rows) {
        await storage.send(
          new DeleteObjectCommand({
            Bucket: process.env.MEDIA_ORIGINALS_BUCKET || "garden-originals",
            Key: row.staging_key,
          }),
        );
        await transaction`update media_photos set staging_cleaned_at=now() where id=${row.id} and status='pending'`;
      }
    }
    return {
      mode: apply ? "apply" : "dry-run",
      limit: 100,
      graceMinutes: 60,
      count: rows.length,
      uploadIds: rows.map((row) => row.id),
    };
  });
  console.log(JSON.stringify(result));
} finally {
  await sql.end();
  storage.destroy();
}
