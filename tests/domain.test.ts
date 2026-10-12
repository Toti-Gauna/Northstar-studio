import {
  activeQuestions,
  brandSchema,
  defaultBrand,
  leadSchema,
  quoteDraftSchema,
  totals,
} from "@northstar/contracts";
import { serviceSchema } from "@northstar/contracts";
import { dictionary } from "../apps/web/src/lib/dictionaries";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { catalog } from "../apps/api/src/db/catalog";
import { estimate, validateBrief } from "../apps/api/src/domain/estimates";
import { validateDocument } from "../apps/api/src/domain/file-validation";
import { defaultDraft } from "../apps/api/src/domain/quotes";
import { inspectFile } from "../apps/api/src/routes/files";
describe("integer pricing and deterministic brief rules", () => {
  it("keeps English and Spanish dictionaries complete and validates editable question/package IDs", () => {
    const keys = (o: unknown, prefix = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        typeof v === "string"
          ? [prefix + k]
          : Array.isArray(v)
            ? [prefix + k + ":" + v.length]
            : keys(v, prefix + k + "."),
      );
    expect(keys(dictionary.es).sort()).toEqual(keys(dictionary.en).sort());
    const service = catalog("digital")[0];
    expect(
      serviceSchema.safeParse({
        ...service,
        packages: [service.packages[0], service.packages[0]],
      }).success,
    ).toBe(false);
    expect(
      serviceSchema.safeParse({
        ...service,
        questions: [{ ...service.questions[2], options: [] }],
      }).success,
    ).toBe(false);
    expect(
      serviceSchema.safeParse({
        ...service,
        questions: [
          {
            ...service.questions[0],
            when: { field: "missing", equals: "Yes" },
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("rounds each line half up, discounts subtotal, taxes discounted net", () => {
    expect(
      totals(
        [
          { id: "a", label: "Work", quantity100: 125, unitMinor: 101 },
          { id: "b", label: "Work", quantity100: 50, unitMinor: 101 },
        ],
        1000,
        2100,
      ),
    ).toEqual({
      subtotalMinor: 177,
      discountMinor: 18,
      taxMinor: 33,
      totalMinor: 192,
    });
  });
  it("handles zero tax, 100% discount and fractional quantities", () => {
    expect(
      totals([{ id: "x", label: "Work", quantity100: 1, unitMinor: 50 }])
        .totalMinor,
    ).toBe(1);
    expect(
      totals(
        [{ id: "x", label: "Work", quantity100: 250, unitMinor: 999 }],
        10000,
        2100,
      ).totalMinor,
    ).toBe(0);
  });
  it("uses independent ARS catalog prices and rejects invented package/addon", () => {
    const service = {
        id: "00000000-0000-4000-8000-000000000001",
        revision: 1,
        data: catalog("technical")[0],
      },
      input = {
        serviceId: service.id,
        packageId: "essential",
        quantity100: 200,
        addonIds: ["workshop"],
        currency: "ARS",
      };
    expect(estimate(service, input).totals.totalMinor).toBe(
      service.data.packages[0].prices.ARS * 2 +
        service.data.addons[0].prices.ARS,
    );
    expect(() => estimate(service, { ...input, packageId: "fake" })).toThrow();
    expect(() => estimate(service, { ...input, addonIds: ["fake"] })).toThrow();
  });
  it("conditional questions require team details only when coordination is Yes", () => {
    const service = {
      id: "00000000-0000-4000-8000-000000000001",
      revision: 1,
      data: catalog("architecture")[0],
    };
    expect(
      activeQuestions(service.data, { coordination: "No" }).map((q) => q.id),
    ).not.toContain("team");
    const brief = {
      serviceId: service.id,
      packageId: "essential",
      quantity100: 100,
      addonIds: [],
      currency: "USD",
      title: "A clear brief",
      name: "Demo person",
      email: "demo@northstar.example",
      source: "website",
      channel: "test",
      campaign: "test",
      attachmentIds: [],
      answers: {
        goal: "Define scope",
        existing: "A site",
        coordination: "Yes",
      },
    };
    expect(() => validateBrief(service, brief)).toThrow("Complete:");
    expect(
      validateBrief(service, {
        ...brief,
        answers: { ...brief.answers, team: "Review team" },
      }),
    ).toBeTruthy();
    expect(() =>
      validateBrief(service, {
        ...brief,
        answers: { ...brief.answers, coordination: "No", team: "Incompatible" },
      }),
    ).toThrow("Remove answers");
  });
  it("does not accept client-calculated totals in submit or quote draft", () => {
    expect(leadSchema.safeParse({ totalMinor: 1 }).success).toBe(false);
    const service = {
        id: "00000000-0000-4000-8000-000000000001",
        revision: 1,
        data: catalog("digital")[0],
      },
      draft = defaultDraft(service, "USD");
    expect(
      quoteDraftSchema.safeParse({ ...draft, totalMinor: 1 }).success,
    ).toBe(false);
    expect(
      quoteDraftSchema.safeParse({
        ...draft,
        options: [draft.options[0], draft.options[0]],
      }).success,
    ).toBe(false);
  });
  it("validates timezone and all three service profiles", () => {
    expect(
      brandSchema.safeParse({ ...defaultBrand, timezone: "Mars/North" })
        .success,
    ).toBe(false);
    for (const p of ["digital", "architecture", "technical"] as const)
      expect(catalog(p)).toHaveLength(3);
  });
  it("rejects mismatched formats, executable text and active PDFs", () => {
    expect(() =>
      inspectFile(
        Buffer.from("<script>alert(1)</script>"),
        "demo.txt",
        "text/plain",
      ),
    ).toThrow();
    expect(() =>
      inspectFile(
        Buffer.from("%PDF-1.7\n/JavaScript\n%%EOF"),
        "demo.pdf",
        "application/pdf",
      ),
    ).toThrow();
    expect(() =>
      inspectFile(Buffer.from("not png"), "demo.png", "image/png"),
    ).toThrow();
    expect(() =>
      inspectFile(
        Buffer.from("Synthetic reference\n"),
        "demo.txt",
        "text/plain",
      ),
    ).not.toThrow();
  });
  it("parses compressed PDF objects and PNG structure before storing an upload", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.catalog.set(
      PDFName.of("OpenAction"),
      doc.context.obj({
        S: PDFName.of("JavaScript"),
        JS: PDFString.of("app.alert(1)"),
      }),
    );
    await expect(
      validateDocument(
        Buffer.from(await doc.save({ useObjectStreams: true })),
        "application/pdf",
      ),
    ).rejects.toThrow();
    const passive = await PDFDocument.create();
    passive.addPage();
    await expect(
      validateDocument(Buffer.from(await passive.save()), "application/pdf"),
    ).resolves.toBeUndefined();
    await expect(
      validateDocument(Buffer.from("not a PNG"), "image/png"),
    ).rejects.toThrow();
  });
});
