import { quoteDraftSchema, type QuoteDraft } from "@northstar/contracts";
import { and, desc, eq } from "drizzle-orm";
import { guard, hash, type Auth } from "../auth";
import { db } from "../db";
import { leads, quotes, versions } from "../db/schema";
import { fail, missing } from "./errors";
import { audit, notify } from "./events";
import { accessibleLead } from "./leads";
import { generatePdf } from "./pdf";
import { requireStorageBudget } from "./storage";
import { accessibleQuote } from "./quote-reads";
import { defaultDraft, draftFromSnapshot, snapshot } from "./quote-snapshot";
export { accept, decline } from "./acceptance";
export { accessibleQuote, compare, versionsFor } from "./quote-reads";
export { defaultDraft, draftFromSnapshot } from "./quote-snapshot";

export async function createRevision(a: Auth, leadId: string, input?: unknown) {
  return db.transaction(async (tx) => {
    const w = await guard(tx, a);
    const lead = await accessibleLead(a, leadId, tx);
    if (!["qualified", "quoted"].includes(lead.status))
      fail(
        409,
        "QUALIFY_FIRST",
        "Qualify an open request before drafting a proposal.",
      );
    let [q] = await tx.select().from(quotes).where(eq(quotes.leadId, leadId));
    if (!q)
      [q] = await tx
        .insert(quotes)
        .values({ workspaceId: a.workspaceId, leadId })
        .returning();
    const [latest] = await tx
      .select()
      .from(versions)
      .where(eq(versions.quoteId, q.id))
      .orderBy(desc(versions.number));
    if (latest?.status === "draft") return { quote: q, version: latest };
    if (latest?.status === "accepted")
      fail(
        409,
        "ALREADY_ACCEPTED",
        "Accepted work cannot be reopened. Submit a new request for an extension.",
      );
    const brief = lead.brief as {
      currency: QuoteDraft["currency"];
      packageId: string;
    };
    const draft = input
      ? quoteDraftSchema.parse(input)
      : latest
        ? draftFromSnapshot(latest.snapshot)
        : defaultDraft(
            lead.service,
            brief.currency,
            brief.packageId,
            w.brand.locale,
          );
    if (draft.currency !== brief.currency)
      fail(
        422,
        "CURRENCY_MISMATCH",
        "A proposal must retain its request currency.",
      );
    if (!input && !latest) {
      const original = lead.estimate as {
        lines: QuoteDraft["options"][number]["lines"];
      };
      draft.options[0].lines = original.lines.map((l) => ({
        ...l,
        label:
          lead.service.data.packages.find((p) => p.id === l.id)?.name[
            w.brand.locale
          ] ||
          lead.service.data.addons.find((a) => a.id === l.id)?.name[
            w.brand.locale
          ] ||
          l.label,
      }));
    }
    // Strip computed snapshot fields before validation when reusing a prior version.
    const s = snapshot(draft, lead, w.brand);
    const [v] = await tx
      .insert(versions)
      .values({
        workspaceId: a.workspaceId,
        quoteId: q.id,
        number: (latest?.number || 0) + 1,
        snapshot: s,
      })
      .returning();
    await audit(tx, a.workspaceId, a.userId, "quote.drafted", q.id, {
      version: v.number,
    });
    return { quote: q, version: v };
  });
}
export async function editDraft(
  a: Auth,
  quoteId: string,
  versionId: string,
  input: unknown,
) {
  return db.transaction(async (tx) => {
    const w = await guard(tx, a);
    const { lead } = await accessibleQuote(a, quoteId, tx);
    const [v] = await tx
      .select()
      .from(versions)
      .where(and(eq(versions.id, versionId), eq(versions.quoteId, quoteId)));
    if (!v) missing();
    if (v.status !== "draft" || !["qualified", "quoted"].includes(lead.status))
      fail(409, "IMMUTABLE_VERSION", "Only an open draft may be edited.");
    const draft = quoteDraftSchema.parse(input);
    if (draft.currency !== (lead.brief as { currency: string }).currency)
      fail(
        422,
        "CURRENCY_MISMATCH",
        "A proposal must retain its request currency.",
      );
    const [updated] = await tx
      .update(versions)
      .set({
        snapshot: snapshot(draft, lead, w.brand, v.snapshot.createdAt),
        updatedAt: new Date(),
      })
      .where(eq(versions.id, v.id))
      .returning();
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "quote.edited",
      quoteId,
      { version: v.number },
      "private",
    );
    return updated;
  });
}
export async function sendRevision(
  a: Auth,
  quoteId: string,
  versionId: string,
) {
  return db.transaction(async (tx) => {
    await guard(tx, a);
    const { lead } = await accessibleQuote(a, quoteId, tx);
    const all = await tx
      .select()
      .from(versions)
      .where(eq(versions.quoteId, quoteId))
      .orderBy(desc(versions.number));
    const v = all.find((x) => x.id === versionId);
    if (!v) missing();
    if (
      v.status !== "draft" ||
      v.id !== all[0].id ||
      !["qualified", "quoted"].includes(lead.status)
    )
      fail(409, "INVALID_SEND", "Only the latest open draft may be sent.");
    const now = new Date(),
      expiresAt = new Date(now.getTime() + v.snapshot.validDays * 86400000);
    const pdf = await generatePdf(v.snapshot, v.id, v.number, now, (size) =>
      requireStorageBudget(tx, a.workspaceId, size),
    );
    await tx
      .update(versions)
      .set({ status: "superseded", updatedAt: now })
      .where(and(eq(versions.quoteId, quoteId), eq(versions.status, "sent")));
    const [sent] = await tx
      .update(versions)
      .set({
        status: "sent",
        sentAt: now,
        expiresAt,
        snapshotHash: hash(JSON.stringify(v.snapshot)),
        pdf,
        updatedAt: now,
      })
      .where(eq(versions.id, v.id))
      .returning();
    await tx
      .update(leads)
      .set({ status: "quoted", updatedAt: now })
      .where(eq(leads.id, lead.id));
    await audit(tx, a.workspaceId, a.userId, "quote.sent", quoteId, {
      version: v.number,
    });
    await notify(tx, a.workspaceId, lead.id, "quote.sent", lead.customerId);
    return sent;
  });
}
