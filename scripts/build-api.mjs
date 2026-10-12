import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const api = JSON.parse(await readFile("apps/api/package.json", "utf8"));
await build({
  absWorkingDir: process.cwd(),
  entryPoints: {
    index: "apps/api/src/index.ts",
    worker: "apps/api/src/worker.ts",
    migrate: "apps/api/src/db/migrate.ts",
  },
  outdir: "apps/api/dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  external: [
    ...Object.keys(api.dependencies).filter(
      (name) => name !== "@northstar/contracts",
    ),
    "zod",
  ],
});
console.log("API, worker and migration runner compiled to apps/api/dist.");
