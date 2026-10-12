import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.PAGES_URL || "http://localhost:3000/Northstar-studio/";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  requests = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => requests.push(request.url()));
await mkdir("docs/evidence/pages", { recursive: true });
await page.goto(base, { waitUntil: "networkidle" });
await expect(page.locator("h1")).toContainText("Turn a clear brief");
await expect(page.locator(".service-row")).toHaveCount(3);
await expect(page.locator(".case-card")).toHaveCount(2);
await expect(page.locator(".history-warning")).toContainText(
  "API not connected",
);
const root = new URL(base).pathname.replace(/\/$/, "");
const badLinks = await page
  .locator("a[href]")
  .evaluateAll(
    (links, root) =>
      links
        .filter(
          (a) =>
            a.getAttribute("href").startsWith("/") &&
            !a.getAttribute("href").startsWith(root + "/"),
        )
        .map((a) => a.getAttribute("href")),
    root,
  );
expect(badLinks).toEqual([]);
await page.screenshot({
  path: "docs/evidence/pages/home-desktop.png",
  fullPage: true,
});
await page.locator(".service-row").first().click();
await expect(page).toHaveURL(new RegExp(root + "/service/\\?id="));
await expect(page.locator(".package-card")).toHaveCount(3);
await page.locator(".package-card .button").first().click();
await expect(page).toHaveURL(new RegExp(root + "/brief/\\?service="));
await expect(page.locator(".session-gate")).toContainText(
  "require the Northstar API",
);
await page.goto(base + "faq/", { waitUntil: "networkidle" });
expect(await page.locator(".faq-item").count()).toBeGreaterThan(0);
await page.locator(".faq-item summary").first().click();
await expect(page.locator(".faq-item").first()).toHaveAttribute("open", "");
await page.selectOption("#language", "es");
await expect(page.locator(".history-warning")).toContainText(
  "API no conectada",
);
await page.goto(base, { waitUntil: "networkidle" });
await expect(page.locator(".history-warning")).toContainText(
  "API no conectada",
);
for (const width of [360, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (width === 390)
    await page.screenshot({
      path: "docs/evidence/pages/home-mobile.png",
      fullPage: true,
    });
}
for (const route of [
  "services/",
  "cases/",
  "process/",
  "client/",
  "operator/",
]) {
  const response = await page.goto(base + route, { waitUntil: "networkidle" });
  expect(response.status()).toBe(200);
  if (["client/", "operator/"].includes(route))
    await expect(page.locator(".session-gate")).toContainText(
      "API no conectada",
    );
}
expect(errors).toEqual([]);
expect(
  requests.filter(
    (url) =>
      url.includes("api-not-connected.invalid") ||
      url.includes("localhost:4000"),
  ),
).toEqual([]);
await writeFile(
  "docs/evidence/pages/check.json",
  JSON.stringify(
    {
      base,
      checkedAt: new Date().toISOString(),
      routes:
        "home, services, service/package, brief gate, cases, process, FAQ, client, operator",
      widths: [360, 390, 768, 1024, 1440],
      assertions:
        "prefix navigation, static catalog, bilingual persistence, no fake API/session, no overflow, no page errors",
      errors,
    },
    null,
    2,
  ),
);
console.log(`Pages smoke passed: ${base}`);
await browser.close();
