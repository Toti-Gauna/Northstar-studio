import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const evidence = "docs/evidence";
async function capture(page: Page, name: string) {
  // Recording pauses give viewers time to read real API-backed scenes, not fake product progress.
  if (
    process.env.DEMO_VIDEO &&
    [
      "home-desktop",
      "brief-desktop",
      "operator-inbox-desktop",
      "proposal-comparison-desktop",
      "proposal-desktop",
      "project-desktop",
    ].includes(name)
  )
    await page.waitForTimeout(7000);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
}
async function openCreated(page: Page, title: string) {
  await page.getByRole("link", { name: title, exact: false }).first().click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}
async function switchRole(page: Page, role: string) {
  await page.getByLabel("Demo identity").selectOption(role);
  await expect(page.getByLabel("Demo identity")).toHaveValue(role);
  await expect(page.locator(".portal-main")).toBeVisible();
}
test("exported build: brief → V1 → comment → V2 → diff → acceptance → project → PDF; persists and isolates", async ({
  page,
  browser,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Turn a clear brief into a confident proposal.",
    }),
  ).toBeVisible();
  await expect(page.locator(".preview-amount")).toContainText("$");
  await capture(page, "home-desktop");
  await page.locator(".preview-cta").click();
  await expect(
    page.getByRole("heading", { name: "Starting scope", exact: true }),
  ).toBeVisible();
  await capture(page, "brief-desktop");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const title = `E2E synthetic service brief ${Date.now()}`;
  await page.getByLabel("Name this request").fill(title);
  await page.getByLabel("Your name", { exact: true }).fill("Demo customer");
  await page.getByLabel("Email address").fill("demo@northstar.example");
  await page
    .getByLabel("What should this work make possible?")
    .fill("A clear scope and a shared work plan.");
  await page
    .locator("textarea#existing")
    .fill("A synthetic reference document.");
  await page
    .getByLabel("Does another team need to be involved?")
    .selectOption("Yes");
  await page
    .getByLabel("Which team and who approves the work?")
    .fill("The fictional review team.");
  await page.getByRole("button", { name: "Use a synthetic reference" }).click();
  await expect(
    page.getByText("synthetic-brief.txt", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Send your brief", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your brief is in the right place." }),
  ).toBeVisible();
  const reference = await page
    .locator(".confirmation-reference strong")
    .innerText();
  const leadId = (
    await page.locator(".confirmation-reference small").innerText()
  ).replace("Request ID: ", "");
  expect(leadId).toMatch(/^[\da-f-]{36}$/);
  await page.getByRole("button", { name: "Operator studio" }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`Request ID: ${leadId}`, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Qualify request", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create proposal draft", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Proposal editor" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Send this version", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Proposal editor" }),
  ).not.toBeVisible();
  await switchRole(page, "customer");
  await openCreated(page, title);
  await page
    .getByLabel("Your comment")
    .fill("Please include a scoped review workshop.");
  await page.getByRole("button", { name: "Post comment", exact: true }).click();
  await expect(
    page.getByText("Please include a scoped review workshop.", { exact: true }),
  ).toBeVisible();
  await switchRole(page, "operator");
  await page.getByLabel("Search requests").fill(title);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await capture(page, "operator-inbox-desktop");
  await openCreated(page, title);
  await page
    .getByRole("button", { name: "Create next revision", exact: true })
    .click();
  await page.getByRole("button", { name: "Add line", exact: true }).click();
  await page
    .getByLabel("Line description", { exact: true })
    .last()
    .fill("Scoped review workshop");
  await page.locator("#price-0-1").fill("500");
  const included = page.locator("#scope-0-included");
  await included.fill(
    (await included.inputValue()) + "\nScoped review workshop",
  );
  await page
    .getByRole("button", { name: "Add alternative", exact: true })
    .click();
  await page.locator("#option-1").fill("Extended review");
  await page.locator("#price-1-1").fill("750");
  await page.locator("#days-1").fill("21");
  const extended = page.locator("#scope-1-included");
  await extended.fill(
    (await extended.inputValue()) + "\nAdditional review session",
  );
  const deliverables = page.locator("#scope-1-deliverables");
  await deliverables.fill(
    (await deliverables.inputValue()) + "\nWorkshop summary and review notes",
  );
  await page
    .getByRole("button", { name: "Save draft & recalculate", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Send this version", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Send this version", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Proposal editor" }),
  ).not.toBeVisible();
  await switchRole(page, "customer");
  await openCreated(page, title);
  await page
    .getByRole("button", { name: "Compare versions", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Scoped review workshop", { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").locator(".diff-summary").first(),
  ).toContainText("+$500.00");
  await capture(page, "proposal-comparison-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "proposal-comparison-mobile");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByLabel("I reviewed the included scope and deliverables.", {
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: /Extended review/ }).click();
  await expect(
    page.getByLabel("I reviewed the included scope and deliverables.", {
      exact: true,
    }),
  ).not.toBeChecked();
  for (const label of [
    "I reviewed the included scope and deliverables.",
    "I reviewed the exclusions.",
    "I reviewed my responsibilities and acceptance criteria.",
    "I reviewed the amount, currency, timing and terms.",
  ])
    await page.getByLabel(label, { exact: true }).check();
  await capture(page, "proposal-desktop");
  await page
    .getByRole("button", { name: "Accept selected option", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Project milestones", exact: true }),
  ).toBeVisible();
  await capture(page, "project-desktop");
  const projectUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Project milestones", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`Request ID: ${leadId}`, { exact: true }),
  ).toBeVisible();
  const task = page.locator(".task select:not([disabled])").first();
  await task.selectOption("done");
  await page.reload();
  await expect(
    page.locator(".task select:not([disabled])").first(),
  ).toHaveValue("done");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Proposal PDF", exact: true }).click();
  const document = await downloadEvent;
  expect(document.suggestedFilename()).toContain(reference);
  await document.saveAs(`${evidence}/accepted-proposal.pdf`);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".toast")).toBeEmpty();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await capture(page, "project-mobile");
  await page.goto(`/client/?view=request&id=${leadId}`);
  await expect(
    page.getByRole("heading", { name: "Your proposal room" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await capture(page, "proposal-mobile");
  const separate = await browser.newContext();
  const other = await separate.newPage();
  await other.goto(projectUrl);
  await expect(
    other.getByText("We couldn’t complete this action."),
  ).toBeVisible();
  await separate.close();
  expect(browserErrors).toEqual([]);
});
test("public export responsive, locale, reduced motion, navigation and keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".preview-amount")).toContainText("$");
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    if ([360, 768].includes(width)) await capture(page, `home-${width}`);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByLabel("Language / Idioma").selectOption("es");
  await expect(
    page.getByRole("heading", {
      name: "De un brief claro a una propuesta segura.",
    }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !!document.activeElement && document.activeElement !== document.body,
      ),
    )
    .toBe(true);
  await page
    .getByRole("link", { name: "Servicios", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "El buen trabajo empieza con una dirección clara.",
    }),
  ).toBeVisible();
  await page.getByLabel("Language / Idioma").selectOption("en");
  await page.locator(".service-row").first().click();
  await expect(page.locator(".package-card")).toHaveCount(3);
  await page.getByRole("link", { name: "Select", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Starting scope", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  await capture(page, "brief-mobile");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
test("failed submit preserves draft and never announces receipt", async ({
  page,
}) => {
  await page.goto("/brief/");
  await expect(
    page.getByRole("heading", { name: "Starting scope", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Name this request")
    .fill("Network recovery synthetic brief");
  await page.getByLabel("Your name", { exact: true }).fill("Demo person");
  await page.getByLabel("Email address").fill("network@northstar.example");
  await page
    .getByLabel("What should this work make possible?")
    .fill("Recover a saved draft");
  await page.locator("#existing").fill("Synthetic reference");
  await page.locator("#coordination").selectOption("No");
  await expect(
    page.getByText("Draft saved to your private workspace", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.route("**/leads", (route) => route.abort());
  await page
    .getByRole("button", { name: "Send your brief", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your brief is in the right place." }),
  ).not.toBeVisible();
  await expect(page.getByText(/Connection interrupted/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Name this request")).toHaveValue(
    "Network recovery synthetic brief",
  );
});
