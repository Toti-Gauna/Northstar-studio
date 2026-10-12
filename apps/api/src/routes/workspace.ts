import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { auth, authenticate, csrf, guard, operator } from "../auth";
import { db } from "../db";
import {
  events,
  leads,
  notifications,
  outbox,
  projects,
  quotes,
} from "../db/schema";
import { fail } from "../domain/errors";
export const workspaceRouter = Router();
workspaceRouter.use(authenticate, csrf);
workspaceRouter.get("/inbox", async (req, res) => {
  const a = auth(req);
  const items = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.workspaceId, a.workspaceId),
        eq(notifications.userId, a.userId),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  res.json({ items, mode: "Real local inbox · no external email sent" });
});
workspaceRouter.post("/inbox/:id/read", async (req, res) => {
  const a = auth(req);
  await db.transaction(async (tx) => {
    await guard(tx, a);
    await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, z.uuid().parse(req.params.id)),
          eq(notifications.userId, a.userId),
          eq(notifications.workspaceId, a.workspaceId),
        ),
      );
  });
  res.json({ read: true });
});
workspaceRouter.get("/outbox", operator, async (req, res) =>
  res.json({
    items: await db
      .select()
      .from(outbox)
      .where(eq(outbox.workspaceId, auth(req).workspaceId))
      .orderBy(desc(outbox.createdAt))
      .limit(100),
    externalDelivery: "not-sent",
  }),
);
workspaceRouter.get("/activity", async (req, res) => {
  const a = auth(req);
  let ids: string[] | undefined;
  if (a.identity !== "operator") {
    const owned = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.workspaceId, a.workspaceId),
          eq(leads.customerId, a.userId),
        ),
      );
    const q = owned.length
      ? await db
          .select({ id: quotes.id })
          .from(quotes)
          .where(
            inArray(
              quotes.leadId,
              owned.map((l) => l.id),
            ),
          )
      : [];
    const p = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, a.workspaceId),
          eq(projects.customerId, a.userId),
        ),
      );
    ids = [...owned, ...q, ...p].map((x) => x.id);
    if (!ids.length) return res.json({ items: [] });
  }
  const entity =
    typeof req.query.entity === "string"
      ? z.uuid().parse(req.query.entity)
      : undefined;
  let related: string[] | undefined;
  if (entity) {
    const q = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(
        and(eq(quotes.workspaceId, a.workspaceId), eq(quotes.leadId, entity)),
      );
    const p = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, a.workspaceId),
          eq(projects.leadId, entity),
        ),
      );
    related = [entity, ...q.map((row) => row.id), ...p.map((row) => row.id)];
  }
  const items = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.workspaceId, a.workspaceId),
        ids ? inArray(events.entityId, ids) : undefined,
        a.identity === "operator" ? undefined : eq(events.visibility, "public"),
        related ? inArray(events.entityId, related) : undefined,
      ),
    )
    .orderBy(desc(events.createdAt))
    .limit(100);
  res.json({ items });
});
workspaceRouter.get("/analytics", operator, async (req, res) => {
  const a = auth(req);
  const counts = await db
    .select({ type: events.type, count: count() })
    .from(events)
    .where(eq(events.workspaceId, a.workspaceId))
    .groupBy(events.type);
  const sources = await db
    .select({
      source: sql<string>`${events.detail}->>'source'`,
      count: count(),
    })
    .from(events)
    .where(
      and(
        eq(events.workspaceId, a.workspaceId),
        eq(events.type, "lead.created"),
      ),
    )
    .groupBy(sql`${events.detail}->>'source'`);
  res.json({
    demo: true,
    counts,
    sources,
    label:
      "Workspace demo events · includes synthetic seed activity · not commercial results",
  });
});
workspaceRouter.get("/sales-card", operator, async (req, res) => {
  const a = auth(req);
  const format = z.enum(["json", "txt"]).parse(req.query.format || "txt");
  const card = {
    brand: a.brand.name,
    profile: a.brand.profile,
    demo: true,
    verifiedLocalFunctions: [
      "Conditional brief and server estimate",
      "Versioned proposal and scope comparison",
      "Recorded acceptance and transactional handoff",
      "Private PDF and local notifications",
    ],
    notice:
      "Fictional company and sample data. No external messages, payments or certified signatures. Review required before sharing.",
  };
  if (format === "json")
    res
      .set(
        "Content-Disposition",
        'attachment; filename="northstar-demo-card.json"',
      )
      .json(card);
  else
    res
      .set({
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="northstar-demo-card.txt"',
      })
      .send(
        `${card.brand} — Service Studio\nEclipse Demo · ${card.profile}\n\n${card.verifiedLocalFunctions.join("\n")}\n\n${card.notice}\n`,
      );
});
workspaceRouter.get("/owner", async () =>
  fail(
    403,
    "NO_GLOBAL_OWNER",
    "Demo identities never grant global administrative access.",
  ),
);
