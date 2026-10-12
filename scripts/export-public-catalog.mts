import { mkdir, writeFile } from "node:fs/promises";
import { catalog, sampleCases, sampleFaq } from "../apps/api/src/db/catalog";
import { defaultBrand } from "@northstar/contracts";
// This is public editorial content only: no workspaces, requests or quotes.
const items = (data: unknown[]) => ({
  items: data.map((data, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    revision: 1,
    data,
  })),
});
await mkdir("apps/web/public", { recursive: true });
await writeFile(
  "apps/web/public/published-catalog.json",
  JSON.stringify({
    brand: defaultBrand,
    services: items(catalog("digital")),
    cases: items(sampleCases("digital")),
    faq: items(sampleFaq("digital")),
  }),
);
