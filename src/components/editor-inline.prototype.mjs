// Disposable design-review server. Serves only the self-contained prototype.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
createServer(async (request, response) => {
  if (
    !["/", "/editor-inline"].includes(
      new URL(request.url, "http://127.0.0.1").pathname,
    )
  ) {
    response.writeHead(404).end("Not found");
    return;
  }
  const html = await readFile(
    new URL("./editor-inline.prototype.html", import.meta.url),
  );
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
}).listen(5174, "127.0.0.1", () =>
  console.log("Editor design prototype: http://127.0.0.1:5174/"),
);
