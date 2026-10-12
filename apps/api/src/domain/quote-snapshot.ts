import {
  quoteDraftSchema,
  totals,
  type QuoteDraft,
  type QuoteSnapshot,
  type Service,
} from "@northstar/contracts";
import { leads } from "../db/schema";
import { fail } from "./errors";

export function defaultDraft(
  service: Service,
  currency: QuoteDraft["currency"],
  packageId?: string,
  locale: "en" | "es" = "en",
): QuoteDraft {
  const pkg =
    service.data.packages.find((p) => p.id === packageId) ||
    service.data.packages[0];
  return {
    currency,
    discountBps: 0,
    taxBps: 0,
    validDays: 14,
    terms:
      locale === "es"
        ? "Demo únicamente. Sin pago ni firma certificada. Inicio sujeto a revisión y disponibilidad."
        : "Demo only. No payment or certified signature. Start date subject to review and availability.",
    options: [
      {
        id: "primary",
        name: pkg.name[locale],
        lines: [
          {
            id: "scope",
            label: service.data.name[locale],
            quantity100: 100,
            unitMinor: pkg.prices[currency],
          },
        ],
        days: pkg.days,
        revisions: pkg.revisions,
        scope: {
          included: pkg.included.map((x) => x[locale]),
          excluded: pkg.excluded.map((x) => x[locale]),
          deliverables: pkg.included.map((x) => x[locale]),
          responsibilities: [
            locale === "es"
              ? "Proporcionar materiales y comentarios consolidados."
              : "Provide source materials and consolidated feedback.",
          ],
          criteria: [
            locale === "es"
              ? "Aprobar los entregables frente al alcance acordado."
              : "Review deliverables against the agreed scope.",
          ],
        },
      },
    ],
  };
}

export function snapshot(
  draft: QuoteDraft,
  lead: typeof leads.$inferSelect,
  brand: QuoteSnapshot["brand"],
  createdAt = new Date().toISOString(),
): QuoteSnapshot {
  const input = quoteDraftSchema.parse(draft);
  const options = input.options.map((o) => ({
    ...o,
    totals: totals(o.lines, input.discountBps, input.taxBps),
  }));
  if (options.some((o) => o.totals.totalMinor > 2000000000))
    fail(
      422,
      "AMOUNT_LIMIT",
      "The demo supports totals below 2 billion minor units.",
    );
  return {
    ...input,
    options,
    brand,
    service: lead.service,
    leadReference: lead.reference,
    customerName: (lead.brief as { name: string }).name,
    createdAt,
  };
}

export const draftFromSnapshot = (s: QuoteSnapshot): QuoteDraft => ({
  currency: s.currency,
  discountBps: s.discountBps,
  taxBps: s.taxBps,
  validDays: s.validDays,
  terms: s.terms,
  options: s.options.map(({ totals: _totals, ...o }) => o),
});
