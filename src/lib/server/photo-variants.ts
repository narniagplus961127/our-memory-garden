import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

export function photoVariantKey(displayKey: string, width: number) {
  return `${displayKey}.w${width}.v1.webp`;
}

export async function writePhotoVariants(
  storage: S3Client,
  bucket: string,
  displayKey: string,
  display: Uint8Array,
  displayWidth: number,
  widths: readonly number[],
) {
  for (const width of widths) {
    if (width >= displayWidth) break;
    const data = await sharp(display)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    await storage.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: photoVariantKey(displayKey, width),
        Body: data,
        ContentType: "image/webp",
        CacheControl: "private, no-store",
      }),
    );
  }
}
