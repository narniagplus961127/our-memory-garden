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
import { MAX_PHOTO_BYTES } from "../media";
import type { Administrator } from "./pages";
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
export async function photoUsages(id: string): Promise<PhotoUsage[]> {
  const rows =
    await database()`select p.id,p.title,p.visibility,(p.deleted_at is not null) as deleted from pages p where ${id}::uuid in (select garden_photo_ids(to_jsonb(p))) order by p.title`;
  return rows as unknown as PhotoUsage[];
}
export async function getPhoto(id: string): Promise<Photo | null> {
  if (!validId.test(id)) return null;
  const rows =
    await database()`select id,name,width,height,original_bytes,display_bytes from media_photos where id=${id} and status='ready'`;
  if (!rows[0]) return null;
  const usages = await photoUsages(id);
  return {
    ...rows[0],
    usages,
    publiclyAccessible: usages.some(
      (u) => u.visibility === "public" && !u.deleted,
    ),
  } as Photo;
}
export async function listPhotos(): Promise<Photo[]> {
  const [photos, usages] = await Promise.all([
    database()<
      Omit<Photo, "usages" | "publiclyAccessible">[]
    >`select id,name,width,height,original_bytes,display_bytes from media_photos where status='ready' order by created_at desc`,
    database()<
      (PhotoUsage & { photo_id: string })[]
    >`select p.id,p.title,p.visibility,(p.deleted_at is not null) as deleted,refs.photo_id from pages p cross join lateral (select distinct garden_photo_ids(to_jsonb(p)) as photo_id) refs order by p.title`,
  ]);
  const byPhoto = new Map<string, PhotoUsage[]>();
  for (const { photo_id, ...usage } of usages) {
    const group = byPhoto.get(photo_id) ?? [];
    group.push(usage);
    byPhoto.set(photo_id, group);
  }
  return photos.map((photo) => {
    const references = byPhoto.get(photo.id) ?? [];
    return {
      ...photo,
      usages: references,
      publiclyAccessible: references.some(
        (u) => u.visibility === "public" && !u.deleted,
      ),
    };
  });
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
    await sql`update media_photos set status='ready',original_bytes=${bytes.length},display_bytes=${display.data.length},width=${display.info.width},height=${display.info.height},original_type=${"image/" + format} where id=${id}`;
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
  kind: "display" | "original",
  admin: Administrator | null,
): Promise<Response> {
  const photo = await getPhoto(id);
  if (!photo || (!admin && (kind === "original" || !photo.publiclyAccessible)))
    throw new RequestError(404, "Photo not found.");
  const rows =
    await database()`select original_key,display_key,original_type from media_photos where id=${id} and status='ready'`;
  if (!rows[0]) throw new RequestError(404, "Photo not found.");
  const object = await storage().send(
    new GetObjectCommand({
      Bucket: kind === "original" ? originalsBucket() : displayBucket(),
      Key: kind === "original" ? rows[0].original_key : rows[0].display_key,
    }),
  );
  if (!object.Body) throw new RequestError(404, "Photo not found.");
  return new Response(object.Body.transformToWebStream(), {
    headers: {
      "Content-Type":
        kind === "original" ? rows[0].original_type : "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      ...(kind === "original"
        ? {
            "Content-Disposition": `attachment; filename="original-${photo.id}.${rows[0].original_type.split("/")[1]}"`,
          }
        : {}),
    },
  });
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
