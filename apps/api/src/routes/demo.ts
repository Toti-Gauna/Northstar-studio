import { roleSchema } from "@northstar/contracts";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import {
  auth,
  authenticate,
  cookieOptions,
  csrf,
  getAuth,
  guard,
  issueSession,
  setSession,
} from "../auth";
import { db } from "../db";
import { sessions, users, workspaces } from "../db/schema";
import { seedWorkspace } from "../db/seed";
import { fail } from "../domain/errors";
import { audit } from "../domain/events";
import { requestLimit } from "../limits";
export const demoRouter = Router();
const limit = requestLimit(15);
demoRouter.post("/demo/session", limit, async (req, res) => {
  if (req.get("X-Northstar-Demo") !== "1")
    fail(403, "CSRF", "A same-origin demo request is required.");
  const existing = await getAuth(req);
  if (existing) return res.json({ workspaceId: existing.workspaceId });
  const result = await db.transaction(async (tx) => {
    const seeded = await seedWorkspace(tx);
    const user = seeded.users.find((u) => u.identity === "customer")!;
    const session = await issueSession(
      tx,
      seeded.workspace.id,
      user.id,
      seeded.workspace.expiresAt,
    );
    return { ...seeded, session };
  });
  setSession(res, result.session.token, result.workspace.expiresAt);
  res.status(201).json({ workspaceId: result.workspace.id });
});
demoRouter.get("/me", authenticate, async (req, res) => {
  const a = auth(req);
  res.json({
    workspaceId: a.workspaceId,
    userId: a.userId,
    identity: a.identity,
    name: a.name,
    role: a.identity === "operator" ? "operator" : "customer",
    csrfToken: a.csrf,
    brand: a.brand,
    expiresAt: a.expiresAt,
    allowedIdentities: ["customer", "customer-2", "customer-3", "operator"],
  });
});
demoRouter.post(
  "/demo/switch-role",
  limit,
  authenticate,
  csrf,
  async (req, res) => {
    const identity = roleSchema.parse(req.body.identity);
    const a = auth(req);
    const result = await db.transaction(async (tx) => {
      const w = await guard(tx, a);
      const [user] = await tx
        .select()
        .from(users)
        .where(
          and(
            eq(users.workspaceId, a.workspaceId),
            eq(users.identity, identity),
          ),
        );
      if (!user)
        fail(
          403,
          "FORBIDDEN",
          "That identity is unavailable in this workspace.",
        );
      await tx.delete(sessions).where(eq(sessions.id, a.sessionId));
      const issued = await issueSession(
        tx,
        a.workspaceId,
        user.id,
        w.expiresAt,
      );
      await audit(
        tx,
        a.workspaceId,
        user.id,
        "session.role_changed",
        a.workspaceId,
        { identity },
        "private",
      );
      return { issued, expiresAt: w.expiresAt };
    });
    setSession(res, result.issued.token, result.expiresAt);
    res.json({ identity });
  },
);
demoRouter.post("/demo/reset", limit, authenticate, csrf, async (req, res) => {
  const a = auth(req);
  await db.transaction(async (tx) => {
    await guard(tx, a);
    await tx
      .update(workspaces)
      .set({ state: "reset", updatedAt: new Date() })
      .where(eq(workspaces.id, a.workspaceId));
    await tx.delete(sessions).where(eq(sessions.workspaceId, a.workspaceId));
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "workspace.reset",
      a.workspaceId,
      {},
      "private",
    );
  });
  res.clearCookie("northstar_session", cookieOptions);
  res.json({ reset: true });
});
demoRouter.post("/auth/logout", authenticate, csrf, async (req, res) => {
  const a = auth(req);
  await db.transaction(async (tx) => {
    await guard(tx, a);
    await tx.delete(sessions).where(eq(sessions.id, a.sessionId));
  });
  res.clearCookie("northstar_session", cookieOptions);
  res.json({ loggedOut: true });
});
