import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
test("generated static CSP permits real hydration, estimate and brief navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await page.goto("/");
  expect(response!.headers()["content-security-policy"]).toContain(
    "script-src 'self' 'sha256-",
  );
  await expect(page.locator(".preview-amount")).toContainText("$");
  await page.locator(".preview-cta").click();
  await expect(
    page.getByRole("heading", { name: "Starting scope", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("accessible home, brief and operator; CMS publication appears in exported frontend", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".preview-amount")).toContainText("$");
  const reports: any[] = [];
  async function audit(name: string) {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    reports.push({
      name,
      violations: result.violations,
      incomplete: result.incomplete.length,
    });
    expect(
      result.violations,
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ),
    ).toEqual([]);
  }
  await audit("home");
  await page.goto("/brief/");
  await expect(
    page.getByRole("heading", { name: "Starting scope", exact: true }),
  ).toBeVisible();
  await audit("brief");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Name this request")).toBeFocused();
  await page.getByLabel("Demo identity").selectOption("operator");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await audit("operator");
  await page.setViewportSize({ width: 360, height: 800 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "docs/evidence/operator-inbox-mobile.png",
    fullPage: true,
  });
  await page.goto("/operator/?view=content");
  await expect(page.locator(".content-item").first()).toBeVisible();
  await page
    .locator(".content-item")
    .filter({ hasText: "Digital Studio" })
    .first()
    .getByRole("button", { name: "Edit draft", exact: true })
    .click();
  const name = `Live published service ${Date.now()}`;
  await page.locator("#quick-name-en").fill(name);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save draft & recalculate", exact: true })
    .click();
  const row = page.locator(".content-item").filter({ hasText: name });
  await row.getByRole("button", { name: "Publish", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await page.goto("/services/");
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.goto("/operator/?view=settings");
  await page.getByLabel("Service profile").selectOption("architecture");
  await page
    .getByRole("button", { name: "Save workspace settings", exact: true })
    .click();
  await expect(
    page
      .getByText(
        "Historic requests from other profiles are preserved with their original scope.",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await page.goto("/services/");
  await expect(
    page.getByRole("heading", { name: "Feasibility & concept", exact: true }),
  ).toBeVisible();
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/axe-report.json",
    JSON.stringify(reports, null, 2),
  );
});
