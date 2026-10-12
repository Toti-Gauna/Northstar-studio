import {
  activeQuestions,
  estimateSchema,
  leadSchema,
  totals,
  type BriefInput,
  type Currency,
  type Service,
} from "@northstar/contracts";
import { and, eq } from "drizzle-orm";
import { db, type Tx } from "../db";
import { content } from "../db/schema";
import { fail, missing } from "./errors";
export async function publishedService(
  workspaceId: string,
  id: string,
  connection: Tx | typeof db = db,
): Promise<Service> {
  const [row] = await connection
    .select()
    .from(content)
    .where(
      and(
        eq(content.workspaceId, workspaceId),
        eq(content.id, id),
        eq(content.kind, "service"),
        eq(content.status, "published"),
      ),
    );
  if (!row?.published) missing();
  return {
    id: row.id,
    revision: row.revision,
    data: row.published as Service["data"],
  };
}
export function estimate(service: Service, input: unknown) {
  const v = estimateSchema.strip().parse(input);
  const pkg = service.data.packages.find((p) => p.id === v.packageId);
  if (!pkg)
    fail(
      422,
      "INVALID_PACKAGE",
      "Select a published package for this service.",
    );
  if (new Set(v.addonIds).size !== v.addonIds.length)
    fail(422, "INVALID_ADDON", "Add-ons must be unique.");
  const lines = [
    {
      id: pkg.id,
      label: pkg.name.en,
      quantity100: v.quantity100,
      unitMinor: pkg.prices[v.currency],
    },
  ];
  for (const id of v.addonIds) {
    const addon = service.data.addons.find((a) => a.id === id);
    if (!addon) fail(422, "INVALID_ADDON", "Select a valid add-on.");
    lines.push({
      id: addon.id,
      label: addon.name.en,
      quantity100: 100,
      unitMinor: addon.prices[v.currency],
    });
  }
  return {
    currency: v.currency,
    lines,
    totals: totals(lines),
    days: pkg.days,
    range: { minDays: pkg.days, maxDays: pkg.days + 7 },
    label: "Estimate — subject to review",
    serviceRevision: service.revision,
  };
}
export function validateBrief(service: Service, input: unknown): BriefInput {
  const v = leadSchema.parse(input);
  const questions = activeQuestions(service.data, v.answers);
  const allowed = new Set(questions.map((q) => q.id));
  for (const key of Object.keys(v.answers))
    if (!allowed.has(key))
      fail(
        422,
        "INCOMPATIBLE_ANSWER",
        "Remove answers that do not apply to this service.",
      );
  for (const q of questions) {
    const value = v.answers[q.id]?.trim();
    if (q.required && !value)
      fail(422, "BRIEF_INCOMPLETE", `Complete: ${q.label.en}`);
    if (
      value &&
      q.type === "number" &&
      (!Number.isFinite(Number(value)) || Number(value) < 0)
    )
      fail(422, "INVALID_ANSWER", `${q.label.en} must be a positive number.`);
    if (value && q.type === "select" && !q.options?.some((o) => o.en === value))
      fail(422, "INVALID_ANSWER", `Select a valid ${q.label.en}.`);
  }
  if (
    v.deadline &&
    (!Number.isFinite(Date.parse(v.deadline)) ||
      new Date(v.deadline).toISOString().slice(0, 10) !== v.deadline)
  )
    fail(422, "INVALID_DATE", "Use a valid deadline.");
  return v;
}
export function requireCurrency(actual: Currency, expected: Currency) {
  if (actual !== expected)
    fail(
      422,
      "CURRENCY_MISMATCH",
      "Use the configured currency for new work. Historic proposals retain their currency.",
    );
}
