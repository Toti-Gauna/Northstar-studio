import { and, count, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { auth, authenticate, csrf, guard, operator, type Auth } from "../auth";
import { db, type Tx } from "../db";
import {
  acceptances,
  leads,
  milestones,
  projects,
  quotes,
  tasks,
} from "../db/schema";
import { fail, missing } from "../domain/errors";
import { audit } from "../domain/events";
export const projectsRouter = Router();
projectsRouter.use(authenticate, csrf);
async function accessibleProject(
  a: Auth,
  id: string,
  connection: Tx | typeof db = db,
) {
  const [row] = await connection
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, id),
        eq(projects.workspaceId, a.workspaceId),
        a.identity === "operator"
          ? undefined
          : eq(projects.customerId, a.userId),
      ),
    );
  if (!row) missing();
  return row;
}
projectsRouter.get("/projects", async (req, res) => {
  const a = auth(req),
    page = Math.max(1, Math.min(1000, Number(req.query.page) || 1)),
    leadId = req.query.leadId ? z.uuid().parse(req.query.leadId) : undefined;
  const where = and(
    eq(projects.workspaceId, a.workspaceId),
    a.identity === "operator" ? undefined : eq(projects.customerId, a.userId),
    leadId ? eq(projects.leadId, leadId) : undefined,
  );
  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(where)
      .orderBy(desc(projects.createdAt), projects.id)
      .limit(10)
      .offset((page - 1) * 10),
    db.select({ total: count() }).from(projects).where(where),
  ]);
  res.json({ items, total, page, pageSize: 10 });
});
projectsRouter.get("/projects/:id", async (req, res) => {
  const a = auth(req),
    project = await accessibleProject(a, z.uuid().parse(req.params.id));
  const m = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, project.id))
    .orderBy(milestones.position);
  const t = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id))
    .orderBy(tasks.createdAt, tasks.id);
  const [acceptance] = await db
    .select()
    .from(acceptances)
    .where(eq(acceptances.id, project.acceptanceId));
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, acceptance.quoteId));
  const [lead] = await db
    .select({ reference: leads.reference })
    .from(leads)
    .where(eq(leads.id, project.leadId));
  res.json({
    ...project,
    reference: lead.reference,
    acceptance,
    quoteId: quote.id,
    milestones: m.map((m) => ({
      ...m,
      tasks: t.filter((t) => t.milestoneId === m.id),
    })),
  });
});
projectsRouter.patch("/tasks/:id", async (req, res) => {
  const a = auth(req),
    id = z.uuid().parse(req.params.id),
    status = z.enum(["todo", "doing", "done"]).parse(req.body.status);
  const result = await db.transaction(async (tx) => {
    await guard(tx, a);
    const [task] = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, a.workspaceId)));
    if (!task) missing();
    await accessibleProject(a, task.projectId, tx);
    if (a.identity !== "operator" && task.owner !== "customer")
      fail(403, "FORBIDDEN", "This task belongs to the service provider.");
    const [row] = await tx
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    await audit(tx, a.workspaceId, a.userId, "task.updated", task.projectId, {
      taskId: id,
      status,
    });
    return row;
  });
  res.json(result);
});
projectsRouter.get("/projects/:id/milestones", async (req, res) => {
  await accessibleProject(auth(req), z.uuid().parse(req.params.id));
  res.json({
    items: await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, String(req.params.id)))
      .orderBy(milestones.position),
  });
});
projectsRouter.patch("/milestones/:id", operator, async (req, res) => {
  const a = auth(req),
    id = z.uuid().parse(req.params.id),
    status = z.enum(["planned", "active", "complete"]).parse(req.body.status);
  const result = await db.transaction(async (tx) => {
    await guard(tx, a);
    const [row] = await tx
      .select()
      .from(milestones)
      .where(
        and(eq(milestones.id, id), eq(milestones.workspaceId, a.workspaceId)),
      );
    if (!row) missing();
    await accessibleProject(a, row.projectId, tx);
    const [updated] = await tx
      .update(milestones)
      .set({ status, updatedAt: new Date() })
      .where(eq(milestones.id, id))
      .returning();
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "milestone.updated",
      row.projectId,
      { milestoneId: id, status },
    );
    return updated;
  });
  res.json(result);
});
