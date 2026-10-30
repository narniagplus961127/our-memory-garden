import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const endpoint = process.env.AWS_ENDPOINT_URL_S3;
if (!endpoint || !new URL(endpoint).hostname.endsWith(".neon.tech"))
  throw new Error(
    "This smoke check requires the hosted Neon object-storage endpoint.",
  );
const client = new S3Client({
  forcePathStyle: true,
  region: process.env.AWS_REGION || "ap-southeast-1",
  endpoint,
});
const key = "garden-smoke/" + crypto.randomUUID(),
  bytes = Buffer.from("private garden storage smoke");
for (const bucket of ["garden-originals", "garden-display"]) {
  try {
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes }),
    );
    const stored = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!Buffer.from(await stored.Body.transformToByteArray()).equals(bytes))
      throw new Error("Signed object round trip failed");
    const unsigned = await fetch(
      endpoint.replace(/\/$/, "") + "/" + bucket + "/" + key,
    );
    if (unsigned.ok) throw new Error("Bucket permits unsigned reads");
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 60 },
    );
    const uploaded = await fetch(uploadUrl, { method: "PUT", body: bytes });
    if (!uploaded.ok)
      throw new Error("Presigned upload failed: " + uploaded.status);
    console.log(
      bucket +
        ": signed round trip and presigned upload passed; unsigned access denied (" +
        unsigned.status +
        ").",
    );
  } finally {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}
