import http from "node:http";
import path from "node:path";
import { stat, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createGzip } from "node:zlib";
const root = path.resolve("apps/web/out");
const headerFile = await readFile(path.join(root, "_headers"), "utf8");
const headers = Object.fromEntries(
  headerFile
    .split("\n")
    .filter((line) => line.startsWith("  "))
    .map((line) => {
      const index = line.indexOf(":");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".map": "application/json",
};
const server = http.createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    const url = new URL(req.url, "http://localhost"),
      pathname = decodeURIComponent(url.pathname);
    if (pathname.split("/").some((part) => part.startsWith("."))) {
      res.writeHead(404);
      return res.end();
    }
    let location = path.resolve(root, "." + pathname);
    if (location !== root && !location.startsWith(root + path.sep)) {
      res.writeHead(404);
      return res.end();
    }
    let info = await stat(location).catch(() => null);
    if (info?.isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(308, { Location: pathname + "/" + url.search });
        return res.end();
      }
      location = path.join(location, "index.html");
      info = await stat(location).catch(() => null);
    }
    if (!info?.isFile()) {
      res.writeHead(404, headers);
      return res.end("Not found");
    }
    const type = mime[path.extname(location)] || "application/octet-stream";
    const gzip =
      /gzip/.test(req.headers["accept-encoding"] || "") &&
      /text|javascript|json/.test(type) &&
      info.size > 1024;
    res.writeHead(200, {
      ...headers,
      "Content-Type": type,
      "Cache-Control": pathname.startsWith("/_next/static/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0",
      ...(gzip
        ? { "Content-Encoding": "gzip", Vary: "Accept-Encoding" }
        : { "Content-Length": info.size }),
    });
    if (req.method === "HEAD") return res.end();
    const stream = createReadStream(location);
    stream.on("error", () => res.destroy());
    if (gzip) stream.pipe(createGzip()).pipe(res);
    else stream.pipe(res);
  } catch {
    res.writeHead(400);
    res.end("Invalid request");
  }
});
server.listen(3000, "0.0.0.0", () =>
  console.log(
    "Northstar static export + real CSP headers http://localhost:3000",
  ),
);
process.on("SIGTERM", () => server.close());
