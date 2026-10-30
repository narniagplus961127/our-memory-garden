import S3rver from "s3rver";
import { mkdir } from "node:fs/promises";
const endpoint = process.env.AWS_ENDPOINT_URL_S3
  ? new URL(process.env.AWS_ENDPOINT_URL_S3)
  : undefined;
if (endpoint && !["127.0.0.1", "localhost"].includes(endpoint.hostname))
  throw new Error("Local storage requires a loopback AWS_ENDPOINT_URL_S3.");
const port = Number(process.env.LOCAL_S3_PORT || endpoint?.port || 59005);
if (
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  (process.env.LOCAL_S3_PORT &&
    endpoint?.port &&
    Number(endpoint.port) !== port)
)
  throw new Error(
    "LOCAL_S3_PORT and AWS_ENDPOINT_URL_S3 must name the same valid local port.",
  );
const directory = "work/local-s3";
await mkdir(directory, { recursive: true });
const origin = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3005";
const cors = `<CORSConfiguration><CORSRule><AllowedOrigin>${origin}</AllowedOrigin><AllowedMethod>PUT</AllowedMethod><AllowedMethod>GET</AllowedMethod><AllowedHeader>*</AllowedHeader></CORSRule></CORSConfiguration>`;
const server = new S3rver({
  address: "127.0.0.1",
  port,
  directory,
  silent: true,
  configureBuckets: ["garden-originals", "garden-display"].map((name) => ({
    name,
    configs: [cors],
  })),
});
await server.run();
console.log("Local S3 fixture listening on 127.0.0.1:" + port);
