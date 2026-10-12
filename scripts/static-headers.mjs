import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env", quiet: true });
const root = path.resolve("apps/web/out"),
  hashes = new Set();
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const location = path.join(dir, item.name);
    if (item.isDirectory()) await walk(location);
    else if (item.name.endsWith(".html")) {
      const html = await readFile(location, "utf8");
      for (const match of html.matchAll(
        /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g,
      ))
        hashes.add(
          `'sha256-${createHash("sha256").update(match[1]).digest("base64")}'`,
        );
    }
  }
}
await walk(root);
const api = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")
  .origin;
const csp = `default-src 'self'; script-src 'self' ${[...hashes].join(" ")}; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' ${api}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`;
await writeFile(
  path.join(root, ".htaccess"),
  `Options -Indexes\nDirectoryIndex index.html\nErrorDocument 404 /404.html\n<IfModule mod_headers.c>\nHeader always set X-Content-Type-Options "nosniff"\nHeader always set Referrer-Policy "strict-origin-when-cross-origin"\nHeader always set X-Frame-Options "DENY"\nHeader always set Content-Security-Policy "${csp}"\n</IfModule>\n`,
);
await writeFile(
  path.join(root, "_headers"),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self' ${[...hashes].join(" ")}; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' ${api}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\n`,
);
console.log(
  `Static hosting headers generated with ${hashes.size} inline script hashes and API origin ${api}.`,
);
