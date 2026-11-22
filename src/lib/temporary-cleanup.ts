import type { Sql } from "postgres";

type RemoveObject = (
  bucket: string,
  key: string,
  signal: AbortSignal,
) => Promise<void>;
type CleanupOptions = {
  apply: boolean;
  originalsBucket: string;
  displayBucket: string;
  variantKeys: (key: string) => string[];
  kind?: "all" | "exports" | "staging";
  exportId?: string;
  deadline?: number;
};
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export async function cleanupTemporaryData(
  sql: Sql,
  remove: RemoveObject,
  options: CleanupOptions,
) {
  if (options.exportId && !uuid.test(options.exportId))
    throw Error("Use a valid export ID.");
  const deadline = options.deadline ?? Date.now() + 200_000;
  const result = {
    mode: options.apply ? "apply" : "dry-run",
    overlap: false,
    deferred: false,
    exports: {
      examined: 0,
      cleaned: 0,
      failed: 0,
      jobs: [] as { id: string; keys: number; action: string }[],
    },
    staging: { examined: 0, cleaned: 0, failed: 0, uploadIds: [] as string[] },
  };
  if (Date.now() >= deadline) {
    result.deferred = true;
    return result;
  }
  const removeKey = async (bucket: string, key: string) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      result.deferred = true;
      return false;
    }
    try {
      await remove(
        bucket,
        key,
        AbortSignal.timeout(Math.min(15_000, remaining)),
      );
      return true;
    } catch {
      return false;
    }
  };
  await sql.begin(async (tx) => {
    await tx`set local statement_timeout='30s'`;
    // Transaction-level lock also works with Neon's transaction-pooled URL.
    const [lock] =
      await tx`select pg_try_advisory_xact_lock(7421901) as acquired`;
    if (!lock.acquired) {
      result.overlap = true;
      return;
    }
    if (options.kind !== "staging") {
      const jobs =
        await tx`select id,object_key from garden_exports where expires_at<=now() and cleaned_at is null
        and (${options.exportId ?? null}::uuid is null or id=${options.exportId ?? null}::uuid)
        order by expires_at,id limit 10 for update skip locked`;
      for (const job of jobs) {
        if (Date.now() >= deadline) {
          result.deferred = true;
          break;
        }
        const parts =
          await tx`select id,object_key from garden_export_parts where export_id=${job.id} order by number limit 50`;
        result.exports.examined++;
        result.exports.jobs.push({
          id: job.id,
          keys: parts.length + 1,
          action: options.apply ? "clean" : "dry-run",
        });
        const safe = new RegExp(
          "^exports/" + job.id + "(?:/[a-zA-Z0-9._-]+\\.(?:tar|json)|\\.tar)$",
        );
        if (
          ![job.object_key, ...parts.map((p) => p.object_key)].every((key) =>
            safe.test(key),
          )
        ) {
          result.exports.failed++;
          continue;
        }
        if (!options.apply) continue;
        await tx`delete from garden_export_items where export_id=${job.id}`;
        await tx`delete from garden_export_records where export_id=${job.id}`;
        let failed = false;
        for (const part of parts) {
          if (await removeKey(options.originalsBucket, part.object_key)) {
            // Expired part rows are retired with their objects, so large exports
            // make progress across bounded daily batches instead of starting over.
            await tx`delete from garden_export_parts where id=${part.id}`;
          } else failed = true;
          if (Date.now() >= deadline) break;
        }
        const [remaining] =
          await tx`select count(*)::int as count from garden_export_parts where export_id=${job.id}`;
        let complete = false;
        if (!remaining.count)
          complete = await removeKey(options.originalsBucket, job.object_key);
        if (!complete && !remaining.count) failed = true;
        if (remaining.count && !failed) result.deferred = true;
        await tx`update garden_exports set status='error',
          error=${complete ? "This export expired. Create a fresh export." : "Expired export cleanup is incomplete; run maintenance again."},
          cleaned_at=${complete ? new Date() : null} where id=${job.id}`;
        if (complete) result.exports.cleaned++;
        if (failed) result.exports.failed++;
      }
    }
    if (options.kind !== "exports" && Date.now() < deadline) {
      const rows =
        await tx`select id,staging_key,original_key,display_key from media_photos
        where status='pending' and expires_at<now()-interval '1 hour' and staging_cleaned_at is null
        order by expires_at,id limit 100 for update skip locked`;
      result.staging.examined = rows.length;
      result.staging.uploadIds = rows.map((row) => row.id);
      for (const row of rows) {
        if (Date.now() >= deadline) {
          result.deferred = true;
          break;
        }
        if (
          !/^staging\/[\da-f-]{36}$/i.test(row.staging_key) ||
          row.original_key !== row.id + "/original" ||
          row.display_key !== row.id + "/display.webp"
        ) {
          result.staging.failed++;
          continue;
        }
        if (!options.apply) continue;
        const keys = [
          [options.originalsBucket, row.staging_key],
          [options.originalsBucket, row.original_key],
          [options.displayBucket, row.display_key],
          ...options
            .variantKeys(row.display_key)
            .map((key) => [options.displayBucket, key]),
        ];
        let complete = true;
        for (const [bucket, key] of keys) {
          if (Date.now() >= deadline) {
            result.deferred = true;
            complete = false;
            break;
          }
          if (!(await removeKey(bucket, key))) complete = false;
        }
        if (complete) {
          await tx`update media_photos set staging_cleaned_at=now() where id=${row.id} and status='pending'`;
          result.staging.cleaned++;
        } else result.staging.failed++;
      }
    }
  });
  return result;
}
