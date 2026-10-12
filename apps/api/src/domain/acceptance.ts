import { and, desc, eq } from "drizzle-orm";
import { customer, guard, type Auth } from "../auth";
import { db } from "../db";
import {
  acceptances,
  leads,
  milestones,
  projects,
  tasks,
  versions,
} from "../db/schema";
import { fail, missing } from "./errors";
import { audit, notify } from "./events";
import { accessibleQuote } from "./quote-reads";
export async function accept(
  a: Auth,
  quoteId: string,
  versionId: string,
  optionId: string,
  checks: string[],
) {
  customer(a);
  return db.transaction(async (tx) => {
    await guard(tx, a);
    const { lead } = await accessibleQuote(a, quoteId, tx);
    const [prior] = await tx
      .select()
      .from(acceptances)
      .where(eq(acceptances.quoteId, quoteId));
    if (prior) {
      if (
        prior.userId !== a.userId ||
        prior.versionId !== versionId ||
        prior.optionId !== optionId
      )
        fail(
          409,
          "ALREADY_ACCEPTED",
          "Another exact version and option has already been accepted.",
        );
      const [project] = await tx
        .select()
        .from(projects)
        .where(eq(projects.acceptanceId, prior.id));
      return { acceptance: prior, project, idempotent: true };
    }
    const [v] = await tx
      .select()
      .from(versions)
      .where(and(eq(versions.id, versionId), eq(versions.quoteId, quoteId)));
    if (!v) missing();
    if (
      v.status !== "sent" ||
      !v.expiresAt ||
      v.expiresAt <= new Date() ||
      lead.status !== "quoted"
    )
      fail(
        409,
        "NOT_ACCEPTABLE",
        "Only the current, unexpired sent proposal can be accepted.",
      );
    const [current] = await tx
      .select()
      .from(versions)
      .where(and(eq(versions.quoteId, quoteId), eq(versions.status, "sent")))
      .orderBy(desc(versions.number));
    if (current?.id !== v.id)
      fail(409, "SUPERSEDED", "This proposal has been replaced.");
    const option = v.snapshot.options.find((o) => o.id === optionId);
    if (!option)
      fail(422, "INVALID_OPTION", "Choose exactly one proposal option.");
    if (
      !["scope", "exclusions", "responsibilities", "terms"].every((c) =>
        checks.includes(c),
      )
    )
      fail(
        422,
        "READING_REQUIRED",
        "Read and confirm all four scope and terms checkpoints.",
      );
    const [acceptance] = await tx
      .insert(acceptances)
      .values({
        workspaceId: a.workspaceId,
        quoteId,
        versionId,
        userId: a.userId,
        optionId,
        amountMinor: option.totals.totalMinor,
        currency: v.snapshot.currency,
        snapshotHash: v.snapshotHash!,
      })
      .returning();
    const [project] = await tx
      .insert(projects)
      .values({
        workspaceId: a.workspaceId,
        leadId: lead.id,
        acceptanceId: acceptance.id,
        customerId: a.userId,
        title: lead.title,
        option,
      })
      .returning();
    for (const [position, m] of v.snapshot.service.data.milestones.entries()) {
      const [milestone] = await tx
        .insert(milestones)
        .values({
          workspaceId: a.workspaceId,
          projectId: project.id,
          title: m.title,
          position,
        })
        .returning();
      await tx.insert(tasks).values(
        m.tasks.map((t) => ({
          workspaceId: a.workspaceId,
          projectId: project.id,
          milestoneId: milestone.id,
          title: t.title,
          owner: t.owner,
        })),
      );
    }
    await tx
      .update(versions)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(versions.id, v.id));
    await tx
      .update(leads)
      .set({ status: "won", updatedAt: new Date() })
      .where(eq(leads.id, lead.id));
    await audit(tx, a.workspaceId, a.userId, "quote.accepted", quoteId, {
      version: v.number,
      optionId,
      checks,
    });
    await audit(tx, a.workspaceId, a.userId, "project.created", project.id, {
      leadId: lead.id,
    });
    await notify(tx, a.workspaceId, lead.id, "project.created", a.userId);
    return { acceptance, project, idempotent: false };
  });
}

export async function decline(a: Auth, quoteId: string, versionId: string) {
  customer(a);
  return db.transaction(async (tx) => {
    await guard(tx, a);
    const { lead } = await accessibleQuote(a, quoteId, tx);
    const [v] = await tx
      .select()
      .from(versions)
      .where(and(eq(versions.id, versionId), eq(versions.quoteId, quoteId)));
    if (!v) missing();
    if (
      v.status !== "sent" ||
      !v.expiresAt ||
      v.expiresAt <= new Date() ||
      lead.status !== "quoted"
    )
      fail(
        409,
        "NOT_DECLINABLE",
        "Only the current unexpired proposal can be declined.",
      );
    await tx
      .update(versions)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(versions.id, v.id));
    await tx
      .update(leads)
      .set({ status: "lost", updatedAt: new Date() })
      .where(eq(leads.id, lead.id));
    await audit(tx, a.workspaceId, a.userId, "quote.declined", quoteId);
    await notify(tx, a.workspaceId, lead.id, "quote.declined", a.userId);
    return { status: "declined" };
  });
}
