import {
  activeQuestions,
  estimateSchema,
  leadSchema,
} from "@northstar/contracts";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { auth, authenticate, csrf, customer, guard, operator } from "../auth";
import { db } from "../db";
import { drafts, quotes } from "../db/schema";
import {
  estimate,
  publishedService,
  requireCurrency,
} from "../domain/estimates";
import {
  addComment,
  createLead,
  leadDetail,
  leadList,
  transition,
} from "../domain/leads";
import { requestLimit } from "../limits";
export const leadsRouter = Router();
leadsRouter.use(authenticate, csrf);
const limit = requestLimit(60);
leadsRouter.post("/estimates", limit, async (req, res) => {
  const a = auth(req),
    input = estimateSchema.parse(req.body);
  requireCurrency(input.currency, a.brand.currency);
  const service = await publishedService(a.workspaceId, input.serviceId);
  res.json(estimate(service, input));
});
leadsRouter.post("/leads", limit, async (req, res) =>
  res
    .status(201)
    .json(
      await createLead(auth(req), req.body, req.get("Idempotency-Key") || ""),
    ),
);
leadsRouter.get("/me/requests", async (req, res) =>
  res.json(await leadList(auth(req), req.query)),
);
leadsRouter.get("/operator/leads", operator, async (req, res) =>
  res.json(await leadList(auth(req), req.query, true)),
);
leadsRouter.get("/leads/:id", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const lead = await leadDetail(auth(req), id);
  const [quote] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(
      and(eq(quotes.leadId, id), eq(quotes.workspaceId, auth(req).workspaceId)),
    );
  res.json({ ...lead, quoteId: quote?.id || null });
});
leadsRouter.post("/leads/:id/transitions", operator, async (req, res) =>
  res.json(
    await transition(
      auth(req),
      z.uuid().parse(req.params.id),
      z.enum(["qualified", "lost"]).parse(req.body.to),
    ),
  ),
);
leadsRouter.post("/leads/:id/comments", async (req, res) => {
  const input = z
    .object({
      body: z.string().trim().min(1).max(4000),
      visibility: z.enum(["public", "private"]),
    })
    .strict()
    .parse(req.body);
  res
    .status(201)
    .json(
      await addComment(
        auth(req),
        z.uuid().parse(req.params.id),
        input.body,
        input.visibility,
      ),
    );
});
leadsRouter.get("/me/brief-draft", async (req, res) => {
  customer(auth(req));
  const [draft] = await db
    .select()
    .from(drafts)
    .where(
      and(
        eq(drafts.workspaceId, auth(req).workspaceId),
        eq(drafts.userId, auth(req).userId),
      ),
    );
  res.json({ data: draft?.data || null });
});
leadsRouter.put("/me/brief-draft", async (req, res) => {
  const a = auth(req);
  customer(a);
  const input = leadSchema.partial().strict().parse(req.body);
  await db.transaction(async (tx) => {
    await guard(tx, a);
    if (input.serviceId) {
      const service = await publishedService(
        a.workspaceId,
        input.serviceId,
        tx,
      );
      const questions = new Set(
        activeQuestions(service.data, input.answers || {}).map((q) => q.id),
      );
      input.answers = Object.fromEntries(
        Object.entries(input.answers || {}).filter(([key]) =>
          questions.has(key),
        ),
      );
    }
    await tx
      .insert(drafts)
      .values({ workspaceId: a.workspaceId, userId: a.userId, data: input })
      .onConflictDoUpdate({
        target: drafts.userId,
        set: { data: input, updatedAt: new Date() },
      });
  });
  res.json({ saved: true });
});
leadsRouter.delete("/me/brief-draft", async (req, res) => {
  const a = auth(req);
  customer(a);
  await db.transaction(async (tx) => {
    await guard(tx, a);
    await tx.delete(drafts).where(eq(drafts.userId, a.userId));
  });
  res.json({ removed: true });
});
