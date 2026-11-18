import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";
import { photoVariantWidths } from "../src/lib/media.ts";
import { writePhotoVariants } from "../src/lib/server/photo-variants.ts";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limit = Number(
  args.find((arg) => /^--limit=\d+$/.test(arg))?.slice(8) ?? 25,
);
if (
  args.some((arg) => arg !== "--apply" && !/^--limit=\d+$/.test(arg)) ||
  !Number.isInteger(limit) ||
  limit < 1 ||
  limit > 100
)
  throw new Error(
    "Use --limit=1 through --limit=100 and add --apply to write thumbnails.",
  );

const connection = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const endpoint = process.env.AWS_ENDPOINT_URL_S3;
if (!connection || (apply && !endpoint))
  throw new Error(
    "Configure the database and, for --apply, AWS_ENDPOINT_URL_S3.",
  );

const concurrency = 4;
const sql = postgres(connection, {
  max: concurrency,
  prepare: false,
  ssl: ["127.0.0.1", "localhost"].includes(new URL(connection).hostname)
    ? false
    : "require",
});
const storage = new S3Client({
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  endpoint,
  region: process.env.AWS_REGION || "ap-southeast-1",
});
const bucket =
  process.env.MEDIA_DISPLAY_BUCKET ||
  process.env.GARDEN_DISPLAY_BUCKET ||
  "garden-display";

try {
  const [pending] = await sql`
    select count(*)::int as count,
      coalesce(sum(display_bytes) filter (where width > ${photoVariantWidths[0]}), 0)::bigint as source_bytes
    from media_photos where status='ready' and not thumbnails_ready
  `;
  console.log(
    JSON.stringify({ mode: apply ? "apply" : "dry-run", limit, ...pending }),
  );
  if (apply) {
    const batch = await sql`
      select id from media_photos where status='ready' and not thumbnails_ready
      order by id limit ${limit}
    `;
    let completed = 0;
    let failed = 0;
    async function backfill({ id }) {
      try {
        const written = await sql.begin(async (transaction) => {
          const [photo] = await transaction`
            select display_key, width from media_photos
            where id=${id} and status='ready' and not thumbnails_ready
            for update skip locked
          `;
          if (!photo) return false;
          if (photo.width > photoVariantWidths[0]) {
            const source = await storage.send(
              new GetObjectCommand({ Bucket: bucket, Key: photo.display_key }),
            );
            if (!source.Body) throw new Error("Missing display photo.");
            await writePhotoVariants(
              storage,
              bucket,
              photo.display_key,
              await source.Body.transformToByteArray(),
              photo.width,
              photoVariantWidths,
            );
          }
          await transaction`update media_photos set thumbnails_ready=true where id=${id}`;
          return true;
        });
        if (written) completed++;
      } catch (error) {
        failed++;
        console.error("Photo thumbnail backfill failed for", id, error?.name);
      }
    }
    for (let offset = 0; offset < batch.length; offset += concurrency) {
      await Promise.all(
        batch.slice(offset, offset + concurrency).map(backfill),
      );
    }
    const [remaining] = await sql`
      select count(*)::int as count from media_photos
      where status='ready' and not thumbnails_ready
    `;
    console.log(
      JSON.stringify({ completed, failed, remaining: remaining.count }),
    );
    if (failed) process.exitCode = 1;
  }
} finally {
  await sql.end();
  storage.destroy();
}
