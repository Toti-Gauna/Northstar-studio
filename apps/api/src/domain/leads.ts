import { leadSchema } from "@northstar/contracts";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { customer, guard, hash, type Auth } from "../auth";
import { db, type Tx } from "../db";
import {
  attachments,
  comments,
  drafts,
  idempotency,
  leads,
  users,
} from "../db/schema";
import { env } from "../env";
import { fail, missing } from "./errors";
import {
  estimate,
  publishedService,
  requireCurrency,
  validateBrief,
} from "./estimates";
import { audit, notify } from "./events";
export async function accessibleLead(
  a: Auth,
  id: string,
  connection: Tx | typeof db = db,
) {
  const [lead] = await connection
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, id),
        eq(leads.workspaceId, a.workspaceId),
        a.identity === "operator" ? undefined : eq(leads.customerId, a.userId),
      ),
    );
  if (!lead) missing();
  return lead;
}
export async function createLead(a: Auth, input: unknown, key: string) {
  customer(a);
  if (!key || key.length > 100)
    fail(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Provide an idempotency key, up to 100 characters.",
    );
  const parsed = leadSchema.parse(input),
    fingerprint = hash(canonical(parsed));
  return db.transaction(async (tx) => {
    const w = await guard(tx, a);
    const [existing] = await tx
      .select()
      .from(idempotency)
      .where(
        and(
          eq(idempotency.workspaceId, a.workspaceId),
          eq(idempotency.userId, a.userId),
          eq(idempotency.scope, "lead-submit"),
          eq(idempotency.key, key),
        ),
      );
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        fail(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This key was already used with different brief contents.",
        );
      return existing.result;
    }
    const service = await publishedService(a.workspaceId, parsed.serviceId, tx),
      brief = validateBrief(service, parsed);
    requireCurrency(brief.currency, w.brand.currency);
    const [{ total }] = await tx
      .select({ total: count() })
      .from(leads)
      .where(eq(leads.workspaceId, a.workspaceId));
    if (total >= env.DEMO_MAX_LEADS)
      fail(
        429,
        "DEMO_LIMIT",
        "The demo workspace has reached its request limit.",
      );
    for (const id of brief.attachmentIds) {
      const [file] = await tx
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.id, id),
            eq(attachments.workspaceId, a.workspaceId),
            eq(attachments.userId, a.userId),
          ),
        );
      if (!file || file.leadId)
        fail(
          422,
          "INVALID_ATTACHMENT",
          "An attachment is unavailable for this request.",
        );
    }
    const reference = `NS-${randomUUID().slice(0, 8).toUpperCase()}`;
    const e = estimate(service, brief);
    const [lead] = await tx
      .insert(leads)
      .values({
        workspaceId: a.workspaceId,
        customerId: a.userId,
        reference,
        title: brief.title,
        brief,
        service,
        estimate: e,
      })
      .returning();
    for (const id of brief.attachmentIds)
      await tx
        .update(attachments)
        .set({ leadId: lead.id })
        .where(eq(attachments.id, id));
    await tx.delete(drafts).where(eq(drafts.userId, a.userId));
    await audit(tx, a.workspaceId, a.userId, "lead.created", lead.id, {
      source: brief.source,
      channel: brief.channel,
      campaign: brief.campaign,
    });
    await notify(tx, a.workspaceId, lead.id, "lead.received", a.userId);
    const result = { id: lead.id, reference };
    await tx.insert(idempotency).values({
      workspaceId: a.workspaceId,
      userId: a.userId,
      scope: "lead-submit",
      key,
      fingerprint,
      result,
    });
    return result;
  });
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}
export async function leadDetail(a: Auth, id: string) {
  const lead = await accessibleLead(a, id);
  const publicComments = await db
    .select({
      id: comments.id,
      body: comments.body,
      visibility: comments.visibility,
      createdAt: comments.createdAt,
      author: users.name,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(
      and(
        eq(comments.leadId, id),
        eq(comments.workspaceId, a.workspaceId),
        a.identity === "operator"
          ? undefined
          : eq(comments.visibility, "public"),
      ),
    )
    .orderBy(comments.createdAt);
  const files = await db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      mime: attachments.mime,
      size: attachments.size,
    })
    .from(attachments)
    .where(
      and(
        eq(attachments.leadId, id),
        eq(attachments.workspaceId, a.workspaceId),
      ),
    );
  return { ...lead, comments: publicComments, attachments: files };
}
export async function transition(a: Auth, id: string, to: string) {
  return db.transaction(async (tx) => {
    await guard(tx, a);
    const lead = await accessibleLead(a, id, tx);
    const allowed: Record<string, string[]> = {
      new: ["qualified", "lost"],
      qualified: ["lost"],
      quoted: ["lost"],
      won: [],
      lost: [],
    };
    if (!allowed[lead.status]?.includes(to))
      fail(
        409,
        "INVALID_TRANSITION",
        "This request cannot move to that stage.",
      );
    const [row] = await tx
      .update(leads)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    await audit(tx, a.workspaceId, a.userId, `lead.${to}`, id);
    return row;
  });
}
export async function addComment(
  a: Auth,
  id: string,
  body: string,
  visibility: string,
) {
  return db.transaction(async (tx) => {
    await guard(tx, a);
    const lead = await accessibleLead(a, id, tx);
    if (visibility === "private" && a.identity !== "operator")
      fail(403, "FORBIDDEN", "Only operators may create internal notes.");
    const [row] = await tx
      .insert(comments)
      .values({
        workspaceId: a.workspaceId,
        leadId: id,
        userId: a.userId,
        body,
        visibility,
      })
      .returning();
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "comment.added",
      id,
      {},
      visibility,
    );
    if (visibility === "public")
      await notify(tx, a.workspaceId, id, "comment.added", lead.customerId);
    return row;
  });
}
export async function leadList(
  a: Auth,
  q: Record<string, unknown>,
  operatorView = false,
) {
  const page = Math.max(1, Math.min(1000, Number(q.page) || 1)),
    size = 10;
  const search =
    typeof q.search === "string" ? q.search.trim().slice(0, 100) : "";
  const statuses = ["new", "qualified", "quoted", "won", "lost"];
  const status =
    typeof q.status === "string" && statuses.includes(q.status)
      ? q.status
      : undefined;
  const source =
    typeof q.source === "string" &&
    ["website", "lead", "cold-email", "referral", "in-person"].includes(
      q.source,
    )
      ? q.source
      : undefined;
  const where = and(
    eq(leads.workspaceId, a.workspaceId),
    operatorView ? undefined : eq(leads.customerId, a.userId),
    status ? eq(leads.status, status) : undefined,
    search
      ? sql`(${leads.title} ilike ${"%" + search + "%"} or ${leads.reference} ilike ${"%" + search + "%"})`
      : undefined,
    source ? sql`${leads.brief}->>'source' = ${source}` : undefined,
  );
  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(where)
      .orderBy(desc(leads.createdAt), desc(leads.id))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ total: count() }).from(leads).where(where),
  ]);
  return { items, total, page, pageSize: size };
}
