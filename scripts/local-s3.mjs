import S3rver from "s3rver";
import { mkdir } from "node:fs/promises";
const directory = "work/local-s3";
await mkdir(directory, { recursive: true });
const origin = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3005";
const cors = `<CORSConfiguration><CORSRule><AllowedOrigin>${origin}</AllowedOrigin><AllowedMethod>PUT</AllowedMethod><AllowedMethod>GET</AllowedMethod><AllowedHeader>*</AllowedHeader></CORSRule></CORSConfiguration>`;
const server = new S3rver({
  address: "127.0.0.1",
  port: 59005,
  directory,
  silent: true,
  configureBuckets: ["garden-originals", "garden-display"].map((name) => ({
    name,
    configs: [cors],
  })),
});
await server.run();
console.log("Local S3 fixture listening on 127.0.0.1:59005");
