import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp, { type OutputInfo } from "sharp";
import type { Photo, PhotoUsage } from "../media";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { database } from "./db";
import { RequestError } from "./http";
import {
  MAX_PHOTO_BYTES,
  photoLibraryPageSize,
  photoVariantWidths,
  type PhotoLibraryPage,
  type PhotoListItem,
  type PhotoVariantWidth,
} from "../media";
import { photoVariantKey, writePhotoVariants } from "./photo-variants";
import type { Administrator } from "./pages";
import { emptyMediaFilters, type MediaFilters } from "../media-filters";
export const originalsBucket = () =>
  process.env.MEDIA_ORIGINALS_BUCKET ||
  process.env.GARDEN_ORIGINALS_BUCKET ||
  "garden-originals";
export const displayBucket = () =>
  process.env.MEDIA_DISPLAY_BUCKET ||
  process.env.GARDEN_DISPLAY_BUCKET ||
  "garden-display";
let client: S3Client | undefined;
export const storage = () =>
  (client ??= new S3Client({
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    region: process.env.AWS_REGION || "ap-southeast-1",
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
  }));
export async function initiatePhoto(
  admin: Administrator,
  body: Record<string, unknown>,
) {
  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.length > 200 ||
    !Number.isSafeInteger(body.size) ||
    Number(body.size) < 1
  )
    throw new RequestError(400, "Choose a photo with a name and size.");
  if (Number(body.size) > MAX_PHOTO_BYTES)
    throw new RequestError(413, "Photos must be 25 MB or smaller.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(String(body.type)))
    throw new RequestError(400, "Choose a JPEG, PNG or WebP photo.");
  const id = crypto.randomUUID(),
    staging = "staging/" + crypto.randomUUID();
  const uploadUrl = await getSignedUrl(
    storage(),
    new PutObjectCommand({
      Bucket: originalsBucket(),
      Key: staging,
      ContentType: String(body.type),
      ContentLength: Number(body.size),
    }),
    { expiresIn: 900 },
  );
  await database()`insert into media_photos(id,name,expected_bytes,staging_key,original_key,display_key,created_by) values(${id},${body.name.trim()},${Number(body.size)},${staging},${id + "/original"},${id + "/display.webp"},${admin.id})`;
  return { id, uploadUrl, expiresIn: 900 };
}
const validId = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
function pageUsages(rows: PhotoUsage[]): PhotoUsage[] {
  const pages = new Map<string, PhotoUsage>();
  for (const usage of rows) {
    const current = pages.get(usage.id);
    if (!current) pages.set(usage.id, usage);
    else if (current.history && !usage.history) pages.set(usage.id, usage);
  }
  return [...pages.values()];
}
export async function photoUsages(id: string): Promise<PhotoUsage[]> {
  const rows =
    await database()`select page_id as id,title,visibility,deleted,history from garden_media_usages where photo_id=${id} and not history order by title`;
  return pageUsages(rows as unknown as PhotoUsage[]);
}
export async function getPhoto(id: string): Promise<Photo | null> {
  if (!validId.test(id)) return null;
  const rows =
    await database()`select id,name,width,height,original_bytes,display_bytes,(status='deleting') as "deletionPending",deletion_error as "deletionError" from media_photos where id=${id} and status in ('ready','deleting')`;
  if (!rows[0]) return null;
  const usages = await photoUsages(id);
  return {
    ...rows[0],
    usages,
    publiclyAccessible: usages.some(
      (u) => u.visibility === "public" && !u.deleted && !u.history,
    ),
  } as Photo;
}
export async function listPhotos(): Promise<Photo[]> {
  const [photos, usages] = await Promise.all([
    database()<
      Omit<Photo, "usages" | "publiclyAccessible">[]
    >`select id,name,width,height,original_bytes,display_bytes,(status='deleting') as "deletionPending",deletion_error as "deletionError" from media_photos where status in ('ready','deleting') order by created_at desc`,
    database()<
      (PhotoUsage & { photo_id: string })[]
    >`select page_id as id,title,visibility,deleted,history,photo_id from garden_media_usages where not history order by title`,
  ]);
  const byPhoto = new Map<string, PhotoUsage[]>();
  for (const { photo_id, ...usage } of usages) {
    const group = byPhoto.get(photo_id) ?? [];
    group.push(usage);
    byPhoto.set(photo_id, group);
  }
  return photos.map((photo) => {
    const references = pageUsages(byPhoto.get(photo.id) ?? []);
    return {
      ...photo,
      usages: references,
      publiclyAccessible: references.some(
        (u) => u.visibility === "public" && !u.deleted && !u.history,
      ),
    };
  });
}
function readLibraryCursor(cursor: string | null) {
  if (cursor === null) return null;
  const [timestamp, id, extra] = cursor.split("/");
  const date = new Date(timestamp);
  if (
    extra !== undefined ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z$/.test(
      timestamp,
    ) ||
    !validId.test(id ?? "") ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 19) !== timestamp.slice(0, 19)
  )
    throw new RequestError(400, "Invalid photo page.");
  return { timestamp, id };
}

export async function listPhotoLibraryPage(
  search: string,
  after: string | null,
  filters: MediaFilters = emptyMediaFilters,
): Promise<PhotoLibraryPage> {
  const cursor = readLibraryCursor(after);
  const sql = database();
  const rows = await sql<(PhotoListItem & { cursorTime: string })[]>`
    with batch as materialized (
      select p.id, p.name, p.width, p.status, p.created_at
      from media_photos p
      where p.status in ('ready','deleting')
        ${photoFilterSql(filters)}
        ${cursor ? sql`and (p.created_at, p.id) < (${cursor.timestamp}::timestamptz, ${cursor.id}::uuid)` : sql``}
        ${
          search
            ? sql`and (
          strpos(lower(p.name), lower(${search})) > 0 or p.id in (
            select photo_id from garden_media_usages
            where not history and strpos(lower(title), lower(${search})) > 0
          )
        )`
            : sql``
        }
      order by p.created_at desc, p.id desc
      limit ${photoLibraryPageSize + 1}
    ), usages as (
      select photo_id, count(distinct page_id)::int as page_count,
        bool_or(visibility='public' and not deleted) as is_public
      from garden_media_usages
      where not history and photo_id in (select id from batch)
      group by photo_id
    )
    select b.id, b.name, b.width, b.status='deleting' as "deletionPending",
      b.created_at as "uploadedAt",
      coalesce(u.page_count, 0) as "usageCount",
      coalesce(u.is_public, false) as "publiclyAccessible",
      to_char(b.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "cursorTime"
    from batch b left join usages u on u.photo_id=b.id
    order by b.created_at desc, b.id desc
  `;
  const page = rows.slice(0, photoLibraryPageSize);
  const last = page.at(-1);
  return {
    photos: page.map(({ cursorTime, ...photo }) => photo),
    nextCursor:
      rows.length > photoLibraryPageSize && last
        ? last.cursorTime + "/" + last.id
        : null,
  };
}
export async function listGridPickerPhotos(
  query: string,
  offset: number,
  limit: number,
  filters: MediaFilters = emptyMediaFilters,
) {
  const sql = database();
  return database()<
    import("../photo-grid").GridPickerPhoto[]
  >`select p.id as "photoId",p.name,p.width,p.height from media_photos p where p.status='ready'
    ${photoFilterSql(filters)}
    and strpos(lower(name),lower(${query}))>0
    order by created_at desc,id limit ${limit} offset ${offset}`;
}
function photoFilterSql(filters: MediaFilters) {
  const sql = database();
  const used = sql`exists(select 1 from garden_media_usages m where m.photo_id=p.id and not m.history)`;
  const isPublic = sql`exists(select 1 from garden_media_usages m where m.photo_id=p.id and not m.history and not m.deleted and m.visibility='public')`;
  return sql`
    ${filters.from ? sql`and p.created_at >= ${filters.from}::date::timestamp at time zone 'UTC'` : sql``}
    ${filters.to ? sql`and p.created_at < (${filters.to}::date + 1)::timestamp at time zone 'UTC'` : sql``}
    ${filters.pageId ? sql`and exists(select 1 from garden_media_usages m where m.photo_id=p.id and m.page_id=${filters.pageId}::uuid and not m.history)` : sql``}
    ${filters.usage === "unused" ? sql`and not ${used}` : filters.usage === "used" ? sql`and ${used}` : filters.usage === "public" ? sql`and ${isPublic}` : filters.usage === "private" ? sql`and not ${isPublic}` : sql``}`;
}
export async function mediaPageOptions(search: string) {
  return database()`select p.id,p.title from pages p where p.deleted_at is null
    and strpos(lower(p.title),lower(${search}))>0
    and exists(select 1 from garden_media_usages u where u.page_id=p.id and not u.history)
    order by lower(p.title),p.id limit 25`;
}
async function boundedOriginal(key: string, expected: number) {
  const object = await storage().send(
    new GetObjectCommand({ Bucket: originalsBucket(), Key: key }),
  );
  if (
    !object.Body ||
    !object.ContentLength ||
    object.ContentLength > MAX_PHOTO_BYTES ||
    object.ContentLength !== expected
  ) {
    await object.Body?.transformToWebStream().cancel();
    throw new RequestError(
      400,
      "The uploaded size does not match. Please upload the photo again.",
    );
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
    length += chunk.length;
    if (length > MAX_PHOTO_BYTES)
      throw new RequestError(413, "Photos must be 25 MB or smaller.");
    chunks.push(chunk);
  }
  if (length !== expected)
    throw new RequestError(400, "The upload is incomplete. Please try again.");
  return Buffer.concat(chunks);
}
export async function completePhoto(id: string): Promise<Photo> {
  if (!validId.test(id)) throw new RequestError(404, "Photo not found.");
  await database().begin(async (sql) => {
    const rows =
      await sql`select * from media_photos where id=${id} for update`;
    const photo = rows[0];
    if (!photo) throw new RequestError(404, "Photo not found.");
    if (photo.status === "ready") return;
    if (photo.status === "deleting")
      throw new RequestError(
        409,
        "This photo has an unfinished deletion. Retry deletion from its details.",
      );
    if (new Date(photo.expires_at).getTime() < Date.now())
      throw new RequestError(
        410,
        "This upload expired. Choose the photo again.",
      );
    let bytes: Buffer;
    try {
      bytes = await boundedOriginal(photo.staging_key, photo.expected_bytes);
    } catch (error) {
      if (error instanceof RequestError) throw error;
      throw new RequestError(
        409,
        "The upload is not available yet. Please try again.",
      );
    }
    let display: { data: Buffer; info: OutputInfo };
    let format: string;
    try {
      const image = sharp(bytes, {
        limitInputPixels: 40000000,
        failOn: "warning",
      });
      const meta = await image.metadata();
      if (
        !meta.format ||
        !["jpeg", "png", "webp"].includes(meta.format) ||
        (meta.pages ?? 1) > 1
      )
        throw new Error("Unsupported image");
      format = meta.format;
      display = await image
        .rotate()
        .resize({
          width: 2560,
          height: 2560,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new RequestError(
        400,
        "Use a valid, still JPEG, PNG or WebP photo up to 40 megapixels.",
      );
    }
    await storage().send(
      new PutObjectCommand({
        Bucket: originalsBucket(),
        Key: photo.original_key,
        Body: bytes,
        ContentType: "image/" + format,
        CacheControl: "private, no-store",
      }),
    );
    await storage().send(
      new PutObjectCommand({
        Bucket: displayBucket(),
        Key: photo.display_key,
        Body: display.data,
        ContentType: "image/webp",
        CacheControl: "private, no-store",
      }),
    );
    await writePhotoVariants(
      storage(),
      displayBucket(),
      photo.display_key,
      display.data,
      display.info.width,
      photoVariantWidths,
    );
    await sql`update media_photos set status='ready',thumbnails_ready=true,original_bytes=${bytes.length},display_bytes=${display.data.length},width=${display.info.width},height=${display.info.height},original_type=${"image/" + format} where id=${id}`;
  });
  // A replay can only change the disposable staging key, never these server-written keys.
  const pending =
    await database()`select staging_key from media_photos where id=${id}`;
  await storage()
    .send(
      new DeleteObjectCommand({
        Bucket: originalsBucket(),
        Key: pending[0].staging_key,
      }),
    )
    .catch(() => {});
  return (await getPhoto(id))!;
}
export async function photoResponse(
  id: string,
  kind: "display" | "original" | PhotoVariantWidth,
  admin: Administrator | null,
  ifNoneMatch: string | null,
): Promise<Response> {
  if (!validId.test(id) || (kind === "original" && !admin))
    throw new RequestError(404, "Photo not found.");
  const [photo] = await database()<
    {
      id: string;
      original_key: string;
      display_key: string;
      original_type: string;
      width: number;
      thumbnails_ready: boolean;
      publicly_accessible: boolean;
    }[]
  >`
    select p.id, p.original_key, p.display_key, p.original_type, p.width, p.thumbnails_ready,
      case when ${kind !== "original"} then exists (
        select 1 from garden_media_usages u
        where u.photo_id=p.id and u.visibility='public' and not u.deleted and not u.history
      ) else false end as publicly_accessible
    from media_photos p where p.id=${id} and p.status='ready'`;
  if (!photo || (!admin && !photo.publicly_accessible))
    throw new RequestError(404, "Photo not found.");

  const variantWidth =
    typeof kind === "number" && photo.thumbnails_ready && photo.width > kind
      ? kind
      : null;
  const headers = new Headers({
    "Content-Type": kind === "original" ? photo.original_type : "image/webp",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  if (photo.publicly_accessible || typeof kind === "number") {
    // Display bytes are immutable for a ready photo. Check live access
    // before validating the browser copy, including administrator-only thumbnails.
    const etag = `"garden-display-v1-${photo.id}${variantWidth ? "-w" + variantWidth : ""}"`;
    headers.set("ETag", etag);
    headers.set("Cache-Control", "private, no-cache");
    if (!photo.publicly_accessible) headers.set("Vary", "Cookie");
    if (
      ifNoneMatch?.split(",").some((entry) => {
        const tag = entry.trim();
        return tag === "*" || tag.replace(/^W\//, "") === etag;
      })
    )
      return new Response(null, { status: 304, headers });
  }
  if (kind === "original")
    headers.set(
      "Content-Disposition",
      `attachment; filename="original-${photo.id}.${photo.original_type.split("/")[1]}"`,
    );
  const object = await storage().send(
    new GetObjectCommand({
      Bucket: kind === "original" ? originalsBucket() : displayBucket(),
      Key:
        kind === "original"
          ? photo.original_key
          : variantWidth
            ? photoVariantKey(photo.display_key, variantWidth)
            : photo.display_key,
    }),
  );
  if (!object.Body) throw new RequestError(404, "Photo not found.");
  if (object.ContentLength !== undefined)
    headers.set("Content-Length", String(object.ContentLength));
  return new Response(object.Body.transformToWebStream(), { headers });
}
import type { PageData } from "../pages";
export async function validatePhotoReferences(content: PageData) {
  const invalid =
    await database()`select reference.id from garden_photo_ids(${database().json(content)}) reference(id) left join media_photos photo on photo.id=reference.id and photo.status='ready' where photo.id is null limit 1`;
  if (invalid.length)
    throw new RequestError(
      400,
      "Choose a ready photo from the shared library.",
    );
}

export async function deletePhoto(id: string) {
  if (!validId.test(id)) throw new RequestError(404, "Photo not found.");
  const photo = await database().begin(async (sql) => {
    const rows =
      await sql`select * from media_photos where id=${id} and status in ('ready','deleting') for update`;
    if (!rows[0]) throw new RequestError(404, "Photo not found.");
    const usages =
      await sql`select page_id from garden_media_usages where photo_id=${id} and not history limit 1`;
    if (usages.length)
      throw new RequestError(
        409,
        "This photo is in use. Remove it from current pages and covers before deleting it.",
      );
    const pins =
      await sql`select i.source_photo_id from garden_export_items i join garden_exports e on e.id=i.export_id where i.photo_id=${id} and e.expires_at>now() limit 1`;
    if (pins.length)
      throw new RequestError(
        409,
        "This photo is being prepared for a backup. Finish or cancel the export before deleting it.",
      );
    await sql`update media_photos set status='deleting',deletion_error=null where id=${id}`;
    return rows[0];
  });
  try {
    // Each operation is idempotent; keep the tombstone if either object fails.
    for (const [Bucket, Key] of [
      [originalsBucket(), photo.original_key],
      [displayBucket(), photo.display_key],
      ...photoVariantWidths
        .filter((width) => width < photo.width)
        .map((width) => [
          displayBucket(),
          photoVariantKey(photo.display_key, width),
        ]),
      [originalsBucket(), photo.staging_key],
    ]) {
      await storage().send(new DeleteObjectCommand({ Bucket, Key }));
    }
    await database()`delete from media_photos where id=${id} and status='deleting'`;
  } catch {
    await database()`update media_photos set deletion_error='Storage deletion was incomplete. Retry to finish removing this photo.' where id=${id}`;
    throw new RequestError(
      503,
      "Storage deletion was incomplete. Retry to finish removing this photo.",
    );
  }
  return { deleted: true };
}
