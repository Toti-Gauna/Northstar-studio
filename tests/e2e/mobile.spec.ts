import { test, expect, type Page } from "@playwright/test";
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
async function activate(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  await expect(button).toBeEnabled();
  await button.focus();
  await page.keyboard.press("Enter");
}
test("keyboard client completes brief and acceptance on mobile with reduced motion; 200% equivalent viewport remains usable", async ({
  page,
}) => {
  await page.goto("/brief/");
  await expect(
    page.getByRole("heading", { name: "Starting scope", exact: true }),
  ).toBeFocused();
  await activate(page, "Continue");
  const title = "Keyboard and mobile synthetic brief";
  await page.getByLabel("Name this request").pressSequentially(title);
  await page
    .getByLabel("Your name", { exact: true })
    .pressSequentially("Demo keyboard customer");
  await page
    .getByLabel("Email address")
    .pressSequentially("keyboard@northstar.example");
  await page
    .getByLabel("What should this work make possible?")
    .pressSequentially("A clear mobile work plan.");
  await page
    .locator("#existing")
    .pressSequentially("Synthetic reference material.");
  await page.locator("#coordination").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#coordination")).toHaveValue("No");
  await activate(page, "Use a synthetic reference");
  await expect(
    page.getByText("synthetic-brief.txt", { exact: true }),
  ).toBeVisible();
  await activate(page, "Continue");
  await activate(page, "Send your brief");
  await expect(
    page.getByRole("heading", { name: "Your brief is in the right place." }),
  ).toBeFocused();
  const id = (
    await page.locator(".confirmation-reference small").innerText()
  ).replace("Request ID: ", "");
  let me = await (await page.request.get("http://localhost:4000/me")).json();
  const command = async (path: string, body: unknown) => {
    const response = await page.request.post("http://localhost:4000" + path, {
      headers: {
        Origin: "http://localhost:3000",
        "X-CSRF-Token": me.csrfToken,
      },
      data: body,
    });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  };
  await command("/demo/switch-role", { identity: "operator" });
  me = await (await page.request.get("http://localhost:4000/me")).json();
  await command(`/leads/${id}/transitions`, { to: "qualified" });
  const quote = await command(`/leads/${id}/quotes`, {});
  await command(`/quotes/${quote.quote.id}/send`, {
    versionId: quote.version.id,
  });
  await command("/demo/switch-role", { identity: "customer" });
  await page.goto(`/client/?view=request&id=${id}`);
  await expect(
    page.getByRole("heading", { name: "Your proposal room" }),
  ).toBeVisible();
  for (const label of [
    "I reviewed the included scope and deliverables.",
    "I reviewed the exclusions.",
    "I reviewed my responsibilities and acceptance criteria.",
    "I reviewed the amount, currency, timing and terms.",
  ]) {
    await page.getByLabel(label, { exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByLabel(label, { exact: true })).toBeChecked();
  }
  await activate(page, "Accept selected option");
  const confirm = page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true });
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Project milestones", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  // 720 CSS px at DPR 2 represents the effective layout of a 1440 px display at 200% zoom.
  await page.setViewportSize({ width: 720, height: 450 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  const pdf = page.getByRole("button", { name: "Proposal PDF", exact: true });
  await pdf.focus();
  await expect(pdf).toBeFocused();
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});
