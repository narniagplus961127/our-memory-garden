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
const faults = process.env.LOCAL_S3_FAULTS === "1";
const server = new S3rver({
  address: "127.0.0.1",
  port: faults ? port + 1 : port,
  directory,
  silent: true,
  configureBuckets: ["garden-originals", "garden-display"].map((name) => ({
    name,
    configs: [cors],
  })),
});
await server.run();
if (faults) {
  const http = await import("node:http");
  let failDisplayDelete = false;
  let failArchiveHead = false,
    failedArchive = "",
    heldArchiveDelete = false,
    releaseArchiveDelete;
  let archiveDeleteGate;
  const proxy = http.createServer(async (request, response) => {
    if (request.url === "/__fixture/archive-cleanup-race") {
      if (request.method === "PUT") {
        failArchiveHead = true;
        failedArchive = "";
        heldArchiveDelete = false;
        archiveDeleteGate = new Promise(
          (resolve) => (releaseArchiveDelete = resolve),
        );
      } else if (request.method === "DELETE") {
        releaseArchiveDelete?.();
      }
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ held: heldArchiveDelete }));
      return;
    }
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    if (
      failArchiveHead &&
      request.method === "HEAD" &&
      path.startsWith("/garden-originals/exports/")
    ) {
      failArchiveHead = false;
      failedArchive = path;
      response.writeHead(400);
      response.end();
      return;
    }
    if (request.method === "DELETE" && path === failedArchive) {
      heldArchiveDelete = true;
      await archiveDeleteGate;
      failedArchive = "";
    }
    if (request.url === "/__fixture/fail-display-delete") {
      failDisplayDelete = request.method === "PUT";
      response.writeHead(204);
      response.end();
      return;
    }
    if (
      failDisplayDelete &&
      request.method === "DELETE" &&
      request.url.startsWith("/garden-display/")
    ) {
      response.writeHead(503, { "Content-Type": "application/xml" });
      response.end(
        "<Error><Code>ServiceUnavailable</Code><Message>Fixture display deletion unavailable</Message></Error>",
      );
      return;
    }
    const upstream = http.request(
      {
        hostname: "127.0.0.1",
        port: port + 1,
        path: request.url,
        method: request.method,
        headers: request.headers,
      },
      (result) => {
        response.writeHead(result.statusCode, result.headers);
        result.pipe(response);
      },
    );
    upstream.on("error", () => {
      response.writeHead(502);
      response.end();
    });
    request.pipe(upstream);
  });
  await new Promise((resolve) => proxy.listen(port, "127.0.0.1", resolve));
}
console.log("Local S3 fixture listening on 127.0.0.1:" + port);
