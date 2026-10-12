import { z } from "zod";
export { totals } from "./pricing";
export type Locale = "en" | "es";
export type Copy = { en: string; es: string };
export const copySchema = z.object({
  en: z.string().min(1).max(4000),
  es: z.string().min(1).max(4000),
});
export const currencySchema = z.enum(["USD", "ARS"]);
export const profileSchema = z.enum(["digital", "architecture", "technical"]);
export type Currency = z.infer<typeof currencySchema>;
export type Profile = z.infer<typeof profileSchema>;
export const roleSchema = z.enum([
  "customer",
  "customer-2",
  "customer-3",
  "operator",
]);
export type DemoIdentity = z.infer<typeof roleSchema>;
export const packageSchema = z.object({
  id: z.string().min(1).max(80),
  name: copySchema,
  prices: z.object({
    USD: z.number().int().min(0).max(100000000),
    ARS: z.number().int().min(0).max(100000000),
  }),
  days: z.number().int().min(1).max(365),
  revisions: z.number().int().min(0).max(20),
  included: z.array(copySchema).min(1).max(20),
  excluded: z.array(copySchema).max(20),
});
export const questionSchema = z
  .object({
    id: z.string().min(1).max(80),
    label: copySchema,
    type: z.enum(["text", "number", "select"]),
    required: z.boolean(),
    options: z.array(copySchema).optional(),
    when: z.object({ field: z.string(), equals: z.string() }).optional(),
    hint: copySchema,
  })
  .refine(
    (q) =>
      q.type !== "select" ||
      (q.options &&
        q.options.length > 0 &&
        new Set(q.options.map((o) => o.en)).size === q.options.length),
    {
      message: "Select questions require uniquely valued options",
      path: ["options"],
    },
  );
export const serviceSchema = z
  .object({
    name: copySchema,
    summary: copySchema,
    description: copySchema,
    profile: profileSchema,
    unit: copySchema,
    packages: z.array(packageSchema).min(1).max(3),
    questions: z.array(questionSchema).max(15),
    addons: z
      .array(
        z.object({
          id: z.string(),
          name: copySchema,
          prices: z.object({
            USD: z.number().int().min(0).max(100000000),
            ARS: z.number().int().min(0).max(100000000),
          }),
        }),
      )
      .max(10),
    milestones: z
      .array(
        z.object({
          title: copySchema,
          tasks: z
            .array(
              z.object({
                title: copySchema,
                owner: z.enum(["customer", "operator"]),
              }),
            )
            .min(1)
            .max(15),
        }),
      )
      .min(1)
      .max(12),
  })
  .superRefine((service, ctx) => {
    for (const key of ["packages", "questions", "addons"] as const) {
      const items = service[key];
      if (new Set(items.map((item) => item.id)).size !== items.length)
        ctx.addIssue({
          code: "custom",
          message: "IDs must be unique",
          path: [key],
        });
    }
    service.questions.forEach((question, index) => {
      if (question.when) {
        const prior = service.questions
          .slice(0, index)
          .find((q) => q.id === question.when!.field);
        if (
          !prior ||
          (prior.type === "select" &&
            !prior.options?.some((o) => o.en === question.when!.equals))
        )
          ctx.addIssue({
            code: "custom",
            message:
              "Conditions must reference a prior question and valid stable value",
            path: ["questions", index, "when"],
          });
      }
    });
  });
export type ServiceData = z.infer<typeof serviceSchema>;
export type Service = { id: string; revision: number; data: ServiceData };
export const estimateSchema = z
  .object({
    serviceId: z.uuid(),
    packageId: z.string().max(80),
    quantity100: z.number().int().min(100).max(10000),
    addonIds: z.array(z.string().max(80)).max(10),
    currency: currencySchema,
  })
  .strict();
export const leadSchema = estimateSchema
  .extend({
    title: z.string().trim().min(4).max(160),
    name: z.string().trim().min(2).max(100),
    email: z.email().max(200),
    answers: z.record(z.string().max(80), z.string().max(2000)),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    source: z.enum(["website", "lead", "cold-email", "referral", "in-person"]),
    channel: z.string().max(80),
    campaign: z.string().max(80),
    attachmentIds: z.array(z.uuid()).max(5),
  })
  .strict();
export type BriefInput = z.infer<typeof leadSchema>;
export const lineSchema = z
  .object({
    id: z.string().min(1).max(80),
    label: z.string().trim().min(1).max(200),
    quantity100: z.number().int().min(1).max(100000),
    unitMinor: z.number().int().min(0).max(100000000),
  })
  .strict();
export const scopeSchema = z.object({
  included: z.array(z.string().min(1).max(2000)).min(1).max(20),
  excluded: z.array(z.string().min(1).max(2000)).max(20),
  deliverables: z.array(z.string().min(1).max(2000)).min(1).max(20),
  responsibilities: z.array(z.string().min(1).max(2000)).min(1).max(20),
  criteria: z.array(z.string().min(1).max(2000)).min(1).max(20),
});
export const optionSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(100),
  lines: z.array(lineSchema).min(1).max(40),
  scope: scopeSchema,
  days: z.number().int().min(1).max(730),
  revisions: z.number().int().min(0).max(20),
});
export const quoteDraftSchema = z
  .object({
    currency: currencySchema,
    options: z.array(optionSchema).min(1).max(3),
    discountBps: z.number().int().min(0).max(10000),
    taxBps: z.number().int().min(0).max(10000),
    validDays: z.number().int().min(1).max(90),
    terms: z.string().min(1).max(4000),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (new Set(v.options.map((o) => o.id)).size !== v.options.length)
      ctx.addIssue({
        code: "custom",
        message: "Option IDs must be unique",
        path: ["options"],
      });
    for (const o of v.options)
      if (new Set(o.lines.map((l) => l.id)).size !== o.lines.length)
        ctx.addIssue({
          code: "custom",
          message: "Line IDs must be unique",
          path: ["options"],
        });
  });
export type QuoteDraft = z.infer<typeof quoteDraftSchema>;
export type QuoteLine = z.infer<typeof lineSchema>;
export type Totals = {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};
export type QuoteSnapshot = Omit<QuoteDraft, "options"> & {
  brand: BrandSettings;
  service: Service;
  leadReference: string;
  customerName: string;
  createdAt: string;
  options: (z.infer<typeof optionSchema> & { totals: Totals })[];
};
export const brandSchema = z.object({
  name: z.string().min(2).max(80),
  tagline: copySchema,
  contact: z.email(),
  logoText: z.string().min(1).max(6),
  navy: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  paper: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  copper: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  locale: z.enum(["en", "es"]),
  currency: currencySchema,
  timezone: z.string().refine((s) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: s });
      return true;
    } catch {
      return false;
    }
  }, "Use an IANA timezone"),
  profile: profileSchema,
});
export type BrandSettings = z.infer<typeof brandSchema>;
export const caseSchema = z.object({
  title: copySchema,
  summary: copySchema,
  challenge: copySchema,
  approach: copySchema,
  profile: profileSchema,
  tag: copySchema,
});
export const faqSchema = z.object({
  question: copySchema,
  answer: copySchema,
  profile: profileSchema,
});
export const templateSchema = z.object({
  name: z.string().min(1).max(100),
  lines: z.array(lineSchema).min(1).max(20),
  scope: scopeSchema,
  currency: currencySchema,
});
export const contentSchemas = {
  service: serviceSchema,
  case: caseSchema,
  faq: faqSchema,
  template: templateSchema,
};
export type ContentKind = keyof typeof contentSchemas;
export const defaultBrand: BrandSettings = {
  name: "Northstar",
  tagline: { en: "Service Studio", es: "Estudio de servicios" },
  contact: "hello@northstar.example",
  logoText: "N✦",
  navy: "#14263D",
  paper: "#F6F1E8",
  copper: "#965538",
  locale: "en",
  currency: "USD",
  timezone: "America/Argentina/Buenos_Aires",
  profile: "digital",
};
export function money(
  minor: number,
  currency: Currency,
  locale: Locale = "en",
) {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
export function activeQuestions(
  service: ServiceData,
  answers: Record<string, string>,
) {
  return service.questions.filter(
    (q) => !q.when || answers[q.when.field] === q.when.equals,
  );
}
