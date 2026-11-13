import "server-only";
import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { mkdtemp, open, rm, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { database } from "./db";
import { storage, originalsBucket, displayBucket } from "./media";
import { RequestError } from "./http";
import type { Administrator } from "./pages";
const validId = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const CONTENT_PART_BYTES = 8 * 1024 * 1024;
function originalsPartBytes() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3
    ? new URL(process.env.AWS_ENDPOINT_URL_S3)
    : null;
  const fixture = Number(process.env.LOCAL_EXPORT_PART_BYTES);
  return endpoint &&
    ["127.0.0.1", "localhost"].includes(endpoint.hostname) &&
    Number.isSafeInteger(fixture) &&
    fixture >= 1024 &&
    fixture <= 200 * 1024 * 1024
    ? fixture
    : 200 * 1024 * 1024;
}
export async function getExport(id?: string) {
  if (id && !validId.test(id)) throw new RequestError(404, "Export not found.");
  // A killed invocation leaves its snapshot available for an explicit retry.
  await database()`update garden_exports set status='error',error='Preparation was interrupted. Resume this export to continue the same snapshot.' where status='pending' and activity_at<now()-interval '5 minutes'`;
  const rows = id
    ? await database()`select id,status,created_at,snapshot_at,expires_at,filename,bytes,error from garden_exports where id=${id}`
    : await database()`select id,status,created_at,snapshot_at,expires_at,filename,bytes,error from garden_exports order by created_at desc limit 1`;
  const job = rows[0];
  if (!job) return null;
  const parts =
    await database()`select id,number,kind,status,filename,bytes,error from garden_export_parts where export_id=${job.id} order by number`;
  const [counts] =
    await database()`select count(*) filter(where kind='photos')::int as photos,count(*) filter(where kind='pages')::int as pages from garden_export_records where export_id=${job.id}`;
  const expired = new Date(job.expires_at).getTime() <= Date.now();
  return {
    ...job,
    id: String(job.id),
    status: String(job.status),
    snapshot_at: job.snapshot_at as string,
    expires_at: job.expires_at as string,
    ...counts,
    parts,
    expired,
    ...(expired
      ? {
          status: "error",
          error: String(job.error || "").includes("cancelled")
            ? String(job.error)
            : "This export expired. Create a fresh export.",
        }
      : {}),
  };
}
export async function createExport(admin: Administrator) {
  const existing = await getExport();
  if (existing && !existing.expired && existing.status === "pending")
    return existing;
  const id = crypto.randomUUID(),
    base =
      "our-memory-garden-" +
      new Date().toISOString().slice(0, 10) +
      "-" +
      id.slice(0, 8);
  try {
    await database().begin(async (sql) => {
      await sql`set transaction isolation level repeatable read`;
      await sql`insert into garden_exports(id,created_by,filename,object_key,snapshot_at) values(${id},${admin.id},${base},${"exports/" + id + "/manifest.json"},now())`;
      for (const table of [
        "pages",
        "garden_settings",
        "garden_navigation",
        "categories",
        "page_categories",
        "page_versions",
        "page_templates",
        "photo_grids",
        "photo_grid_entries",
      ]) {
        const [exists] = await sql`select to_regclass(${table}) as name`;
        if (exists?.name)
          await sql`insert into garden_export_records(export_id,kind,document) select ${id},${table},to_jsonb(source) from ${sql(table)} source`;
      }
      let number = 0;
      async function part(kind: string) {
        const partId = crypto.randomUUID();
        number++;
        const filename =
          base + "-part-" + String(number).padStart(4, "0") + ".tar";
        await sql`insert into garden_export_parts(id,export_id,number,kind,filename,object_key) values(${partId},${id},${number},${kind},${filename},${"exports/" + id + "/" + filename})`;
        return partId;
      }
      // Snapshot immutable inventory and pin all originals before releasing the DB
      // snapshot. Page saves remain possible; deletion shares these row locks.
      let photoPart: string | undefined,
        photoBytes = 0,
        photoCount = 0;
      let lastPhoto = "00000000-0000-0000-0000-000000000000";
      while (true) {
        const batch =
          await sql`select * from media_photos where status='ready' and id>${lastPhoto}::uuid order by id limit 100 for share`;
        if (!batch.length) break;
        const items = [];
        const records = [];
        for (const photo of batch) {
          lastPhoto = photo.id;
          if (
            !photoPart ||
            photoCount >= 50 ||
            photoBytes + Number(photo.original_bytes) + 1024 >
              originalsPartBytes() - 4096
          ) {
            photoPart = await part("originals");
            photoBytes = 0;
            photoCount = 0;
          }
          items.push({
            source_photo_id: photo.id,
            photo_id: photo.id,
            part_id: photoPart,
            original_key: photo.original_key,
            original_type: photo.original_type,
            original_bytes: photo.original_bytes,
          });
          const record = {
            id: photo.id,
            name: photo.name,
            width: photo.width,
            height: photo.height,
            originalType: photo.original_type,
            originalBytes: photo.original_bytes,
            file:
              "originals/" +
              photo.id +
              "." +
              String(photo.original_type).split("/")[1],
            partId: photoPart,
          };
          records.push({ document: record });
          photoBytes += Number(photo.original_bytes) + 1024;
          photoCount++;
        }
        await sql`insert into garden_export_items(export_id,source_photo_id,photo_id,part_id,original_key,original_type,original_bytes) select ${id},i.source_photo_id,i.photo_id,i.part_id,i.original_key,i.original_type,i.original_bytes from jsonb_to_recordset(${sql.json(items)}) as i(source_photo_id uuid,photo_id uuid,part_id uuid,original_key text,original_type text,original_bytes integer)`;
        await sql`insert into garden_export_records(export_id,kind,document) select ${id},'photos',r.document from jsonb_to_recordset(${sql.json(records)}) as r(document jsonb)`;
      }
      let contentPart: string | undefined,
        contentBytes = 0,
        contentCount = 0;
      let lastRecord = "0";
      while (true) {
        const batch =
          await sql`select id,octet_length(document::text)+1024 as bytes from garden_export_records where export_id=${id} and id>${lastRecord} order by id limit 100`;
        if (!batch.length) break;
        const assignments = [];
        for (const record of batch) {
          lastRecord = record.id;
          if (
            !contentPart ||
            contentCount >= 1000 ||
            contentBytes + Number(record.bytes) > CONTENT_PART_BYTES - 4096
          ) {
            contentPart = await part("content");
            contentBytes = 0;
            contentCount = 0;
          }
          assignments.push({ id: record.id, part_id: contentPart });
          contentBytes += Number(record.bytes);
          contentCount++;
        }
        await sql`update garden_export_records r set part_id=a.part_id from jsonb_to_recordset(${sql.json(assignments)}) as a(id bigint,part_id uuid) where r.id=a.id and r.export_id=${id}`;
      }
      if (number === 0) await part("content");
    });
  } catch (error) {
    if (!(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ))
      throw error;
    return getExport();
  }
  return getExport(id);
}
function tarHeader(name: string, size: number) {
  const header = Buffer.alloc(512);
  const text = (value: string, offset: number, length: number) =>
    header.write(value, offset, length, "utf8");
  const octal = (value: number, offset: number, length: number) =>
    text(value.toString(8).padStart(length - 1, "0") + "\0", offset, length);
  text(name, 0, 100);
  octal(0o600, 100, 8);
  octal(0, 108, 8);
  octal(0, 116, 8);
  octal(size, 124, 12);
  octal(Math.floor(Date.now() / 1000), 136, 12);
  header.fill(32, 148, 156);
  text("0", 156, 1);
  text("ustar\0", 257, 6);
  text("00", 263, 2);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  text(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return header;
}
const instructions =
  "Our Memory Garden independent backup · format our-memory-garden/v2\n\nDownload manifest.json and EVERY listed TAR part. Extract all parts into the SAME folder with a standard archive tool. content/<table>/<record>.json contains one exact database snapshot record; content/photos records map photo IDs to exact originals/<id>.<type> bytes. Private and trashed pages and retained history are included. The manifest records snapshot time, inventory paths and actual archive part state/size. It is complete only when every part is ready. Keep all files private. No passwords, sessions or storage credentials are included. This is an independent content backup, not a one-click application restore package.\n";
export async function generateExport(id: string) {
  if (!validId.test(id)) throw new RequestError(404, "Export not found.");
  const job = await getExport(id);
  if (!job) throw new RequestError(404, "Export not found.");
  if (job.expired)
    throw new RequestError(410, "This export expired. Create a fresh export.");
  if (job.status === "ready") return job;
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 260000);
  let directory: string | undefined, partId: string | undefined;
  try {
    await database().begin(async (sql) => {
      const [locked] =
        await sql`select * from garden_exports where id=${id} for update skip locked`;
      if (!locked || new Date(locked.expires_at).getTime() <= Date.now())
        return;
      const [part] =
        await sql`select * from garden_export_parts where export_id=${id} and status<>'ready' order by number limit 1 for update`;
      if (!part) return;
      partId = part.id;
      await sql`update garden_exports set status='pending',error=null,activity_at=now() where id=${id}`;
      directory = await mkdtemp(join(tmpdir(), "memory-garden-export-"));
      const file = join(directory, "part.tar"),
        handle = await open(file, "w");
      let total = 0;
      async function write(bytes: Uint8Array) {
        if (controller.signal.aborted) throw new Error("timeout");
        total += bytes.length;
        if (
          total >
          (part.kind === "content" ? CONTENT_PART_BYTES : 200 * 1024 * 1024)
        )
          throw new Error("part size");
        await handle.writeFile(bytes);
      }
      async function entry(name: string, bytes: Buffer) {
        await write(tarHeader(name, bytes.length));
        await write(bytes);
        if (bytes.length % 512)
          await write(Buffer.alloc(512 - (bytes.length % 512)));
      }
      try {
        await entry("README.txt", Buffer.from(instructions));
        if (part.kind === "content")
          for await (const batch of sql`select id,kind,document::text as document from garden_export_records where part_id=${part.id} order by id`.cursor(
            10,
          ))
            for (const record of batch)
              await entry(
                "content/" + record.kind + "/" + record.id + ".json",
                Buffer.from(record.document),
              );
        else
          for await (const batch of sql`select * from garden_export_items where part_id=${part.id} order by source_photo_id`.cursor(
            10,
          ))
            for (const photo of batch) {
              const object = await storage().send(
                new GetObjectCommand({
                  Bucket: originalsBucket(),
                  Key: photo.original_key,
                }),
                { abortSignal: controller.signal },
              );
              if (
                !object.Body ||
                Number(object.ContentLength) !== Number(photo.original_bytes)
              )
                throw new Error("original unavailable");
              await write(
                tarHeader(
                  "originals/" +
                    photo.source_photo_id +
                    "." +
                    photo.original_type.split("/")[1],
                  Number(photo.original_bytes),
                ),
              );
              let length = 0;
              for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
                length += chunk.length;
                if (length > Number(photo.original_bytes))
                  throw new Error("original size");
                await write(chunk);
              }
              if (length !== Number(photo.original_bytes))
                throw new Error("original incomplete");
              if (length % 512) await write(Buffer.alloc(512 - (length % 512)));
            }
        await write(Buffer.alloc(1024));
      } finally {
        await handle.close();
      }
      const size = (await stat(file)).size;
      const body = createReadStream(file);
      try {
        await storage().send(
          new PutObjectCommand({
            Bucket: originalsBucket(),
            Key: part.object_key,
            Body: body,
            ContentLength: size,
            ContentType: "application/x-tar",
            CacheControl: "private, no-store",
          }),
          { abortSignal: controller.signal },
        );
      } finally {
        body.destroy();
        await finished(body, { cleanup: true }).catch(() => {});
      }
      const stored = await storage().send(
        new HeadObjectCommand({
          Bucket: originalsBucket(),
          Key: part.object_key,
        }),
        { abortSignal: controller.signal },
      );
      if (Number(stored.ContentLength) !== size)
        throw new Error("archive verification");
      await sql`update garden_export_parts set status='ready',bytes=${size},error=null where id=${part.id}`;
      await sql`update garden_export_items set photo_id=null where part_id=${part.id}`;
      await sql`update garden_exports set status=case when exists(select 1 from garden_export_parts where export_id=${id} and status<>'ready') then 'pending' else 'ready' end,bytes=(select coalesce(sum(bytes),0) from garden_export_parts where export_id=${id}),error=null,activity_at=now(),expires_at=now()+interval '24 hours' where id=${id}`;
    });
  } catch {
    if (partId) {
      const failedPartId = partId;
      await database().begin(async (sql) => {
        await sql`select id from garden_exports where id=${id} for update`;
        const [part] =
          await sql`select status,object_key from garden_export_parts where id=${failedPartId} for update`;
        if (!part || part.status === "ready") return null;
        await sql`update garden_export_parts set status='error',error='This part could not be prepared. Resume to retry the same snapshot.' where id=${failedPartId}`;
        await sql`update garden_exports set status='error',error='Preparation failed. Resume to retry the unfinished part; completed downloads are retained.',activity_at=now() where id=${id}`;
        // Retry writes the same archive key. Keep cleanup under the job/part
        // locks so an older failure cannot delete a newly verified retry.
        await storage()
          .send(
            new DeleteObjectCommand({
              Bucket: originalsBucket(),
              Key: part.object_key,
            }),
          )
          .catch(() => {});
      });
    } else
      throw new RequestError(503, "Could not start preparation. Please retry.");
  } finally {
    clearTimeout(timeout);
    if (
      directory &&
      dirname(resolve(directory)) === resolve(tmpdir()) &&
      basename(directory).startsWith("memory-garden-export-")
    )
      await rm(directory, { recursive: true, force: true });
  }
  return getExport(id);
}
export async function cancelExport(id: string) {
  if (!validId.test(id)) throw new RequestError(404, "Export not found.");
  await database().begin(async (sql) => {
    const [job] =
      await sql`select id from garden_exports where id=${id} for update`;
    if (!job) throw new RequestError(404, "Export not found.");
    await sql`update garden_export_items set photo_id=null where export_id=${id}`;
    await sql`update garden_exports set status='error',error='This export was cancelled. Create a fresh export.',expires_at=now() where id=${id}`;
  });
  return getExport(id);
}
async function readableJob(id: string) {
  const job = await getExport(id);
  if (!job) throw new RequestError(404, "Export not found.");
  if (job.expired)
    throw new RequestError(410, "This export expired. Create a fresh export.");
  return job;
}
export async function exportManifest(id: string) {
  const job = await readableJob(id);
  async function* chunks() {
    const header = {
      format: "our-memory-garden/v2",
      snapshotAt: job.snapshot_at,
      complete: job.status === "ready",
      expiresAt: job.expires_at,
      instructions,
      parts: job.parts,
    };
    yield Buffer.from(JSON.stringify(header).slice(0, -1) + ',"inventory":[');
    let first = true;
    for await (const batch of database()`select kind,id,part_id,case when kind='photos' then document else jsonb_build_object('id',document->'id','page_id',document->'page_id') end as document from garden_export_records where export_id=${id} order by id`.cursor(
      100,
    ))
      for (const record of batch) {
        yield Buffer.from(
          (first ? "" : ",") +
            JSON.stringify({
              path: "content/" + record.kind + "/" + record.id + ".json",
              partId: record.part_id,
              kind: record.kind,
              ...(record.kind === "photos"
                ? { photo: record.document }
                : {
                    id: record.document.id ?? record.document.page_id ?? null,
                  }),
            }),
        );
        first = false;
      }
    yield Buffer.from("]}");
  }
  return new Response(
    Readable.toWeb(Readable.from(chunks())) as ReadableStream,
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="manifest.json"',
        "Cache-Control": "private, no-store",
      },
    },
  );
}
export async function exportDownload(
  id: string,
  partId: string,
  range: string | null,
) {
  const job = await readableJob(id);
  if (!validId.test(partId))
    throw new RequestError(404, "Archive part not found.");
  const [part] =
    await database()`select * from garden_export_parts where id=${partId} and export_id=${id}`;
  if (!part) throw new RequestError(404, "Archive part not found.");
  if (part.status !== "ready")
    throw new RequestError(
      409,
      "This archive part is not ready. Resume preparation.",
    );
  let start = 0,
    end = Number(part.bytes) - 1;
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) throw new RequestError(416, "Choose a valid byte range.");
    start = Number(match[1]);
    if (match[2]) end = Math.min(Number(match[2]), end);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= Number(part.bytes)
    )
      throw new RequestError(416, "The requested range is unavailable.");
  }
  void job;
  const object = await storage().send(
    new GetObjectCommand({
      Bucket: originalsBucket(),
      Key: part.object_key,
      ...(range ? { Range: `bytes=${start}-${end}` } : {}),
    }),
  );
  if (!object.Body)
    throw new RequestError(
      503,
      "The archive is unavailable. Resume or create a fresh export.",
    );
  return new Response(object.Body.transformToWebStream(), {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": "application/x-tar",
      "Content-Length": String(end - start + 1),
      "Content-Disposition": `attachment; filename="${part.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      ...(range
        ? { "Content-Range": `bytes ${start}-${end}/${part.bytes}` }
        : {}),
    },
  });
}
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
