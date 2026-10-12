import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const chrome = await launch({
  chromePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const browser = await chromium.connectOverCDP(
      `http://localhost:${chrome.port}`,
    ),
    context = browser.contexts()[0],
    page = await context.newPage();
  await page.goto("http://localhost:3000");
  await page.locator(".preview-amount").filter({ hasText: "$" }).waitFor();
  for (const [name, url] of [
    ["public", "http://localhost:3000"],
    ["operator", "http://localhost:3000/operator/"],
  ]) {
    if (name === "operator") {
      await page.getByLabel("Demo identity").selectOption("operator");
      await page.waitForURL("**/operator/");
      await page.locator("tbody tr").first().waitFor();
    }
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      disableStorageReset: true,
    });
    await mkdir("docs/evidence", { recursive: true });
    await writeFile(`docs/evidence/lighthouse-${name}.json`, result.report);
    console.log(
      name,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(result.lhr.categories).map(([key, value]) => [
            key,
            Math.round(value.score * 100),
          ]),
        ),
      ),
    );
  }
  await browser.close();
} finally {
  await chrome.kill();
}
