import "server-only";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { database } from "./db";
import { storage, originalsBucket, displayBucket } from "./media";

export async function storageUsage() {
  const measuredAt = new Date().toISOString();
  let originals = 0,
    display = 0,
    archives = 0,
    staging = 0;
  for (const bucket of [originalsBucket(), displayBucket()]) {
    let token: string | undefined;
    do {
      const page = await storage().send(
        new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
        { abortSignal: AbortSignal.timeout(30000) },
      );
      for (const item of page.Contents ?? []) {
        const size = Number(item.Size ?? 0);
        if (bucket === displayBucket()) display += size;
        else if (item.Key?.startsWith("exports/")) archives += size;
        else if (item.Key?.startsWith("staging/")) staging += size;
        else originals += size;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
  const [dbSize] =
    await database()`select pg_database_size(current_database()) as bytes`;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3
    ? new URL(process.env.AWS_ENDPOINT_URL_S3)
    : null;
  return {
    originals,
    display,
    archives,
    staging,
    total: originals + display + archives + staging,
    measuredAt,
    source:
      endpoint && ["127.0.0.1", "localhost"].includes(endpoint.hostname)
        ? "Local S3-compatible object storage · bucket listing"
        : "S3-compatible object storage · bucket listing",
    databaseBytes: Number(dbSize.bytes),
    databaseSource:
      "PostgreSQL pg_database_size(current_database()) · physical database bytes",
    quota: null,
    plan: null,
  };
}
