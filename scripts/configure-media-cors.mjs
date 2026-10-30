import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
const origin = process.env.MEDIA_CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL;
if (
  !origin ||
  new URL(origin).origin !== origin ||
  !(
    origin.startsWith("https://") ||
    ["127.0.0.1", "localhost"].includes(new URL(origin).hostname)
  )
)
  throw new Error("Set MEDIA_CORS_ORIGIN to the exact application origin.");
const endpoint = process.env.AWS_ENDPOINT_URL_S3;
if (!endpoint) throw new Error("AWS_ENDPOINT_URL_S3 is required.");
const client = new S3Client({
  forcePathStyle: true,
  region: process.env.AWS_REGION || "ap-southeast-1",
  endpoint,
});
const Bucket =
  process.env.MEDIA_ORIGINALS_BUCKET ||
  process.env.GARDEN_ORIGINALS_BUCKET ||
  "garden-originals";
let existing = [];
try {
  existing =
    (await client.send(new GetBucketCorsCommand({ Bucket }))).CORSRules || [];
} catch (error) {
  if (!["NoSuchCORSConfiguration", "NoSuchCORS"].includes(error.name))
    throw error;
}
if (
  !existing.some(
    (rule) =>
      rule.AllowedOrigins?.includes(origin) &&
      rule.AllowedMethods?.includes("PUT") &&
      rule.AllowedHeaders?.includes("*"),
  )
) {
  await client.send(
    new PutBucketCorsCommand({
      Bucket,
      CORSConfiguration: {
        CORSRules: [
          ...existing,
          {
            AllowedOrigins: [origin],
            AllowedMethods: ["PUT"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 300,
          },
        ],
      },
    }),
  );
}
const preflightUrl = await getSignedUrl(
  client,
  new PutObjectCommand({ Bucket, Key: "staging/cors-check" }),
  { expiresIn: 60 },
);
const response = await fetch(preflightUrl, {
  method: "OPTIONS",
  headers: {
    Origin: origin,
    "Access-Control-Request-Method": "PUT",
    "Access-Control-Request-Headers": "content-type",
  },
});
if (
  !response.ok ||
  ![origin, "*"].includes(
    response.headers.get("access-control-allow-origin"),
  ) ||
  !response.headers.get("access-control-allow-methods")?.includes("PUT")
)
  throw new Error(
    "Browser PUT preflight was not permitted: " +
      JSON.stringify({
        status: response.status,
        origin: response.headers.get("access-control-allow-origin"),
        methods: response.headers.get("access-control-allow-methods"),
      }),
  );
console.log(
  "Exact-origin CORS rule stored; browser PUT preflight passed with provider Allow-Origin=" +
    response.headers.get("access-control-allow-origin") +
    "; existing rules preserved.",
);
