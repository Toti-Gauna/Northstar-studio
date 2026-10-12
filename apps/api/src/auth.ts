import type { BrandSettings, DemoIdentity } from "@northstar/contracts";
import { and, eq, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { db, type Tx } from "./db";
import { sessions, users, workspaces } from "./db/schema";
import { fail } from "./domain/errors";
import { env } from "./env";
export type Auth = {
  workspaceId: string;
  userId: string;
  sessionId: string;
  identity: DemoIdentity;
  name: string;
  csrf: string;
  brand: BrandSettings;
  expiresAt: Date;
};
export type AuthedRequest = Request & { auth?: Auth; requestId?: string };
export const hash = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
export const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: "/",
} as const;
export async function getAuth(req: Request): Promise<Auth | null> {
  const token = req.cookies?.northstar_session;
  if (typeof token !== "string" || token.length !== 64) return null;
  const [row] = await db
    .select({ session: sessions, user: users, workspace: workspaces })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(workspaces, eq(sessions.workspaceId, workspaces.id))
    .where(eq(sessions.tokenHash, hash(token)));
  if (
    !row ||
    row.workspace.state !== "active" ||
    row.workspace.expiresAt <= new Date() ||
    row.session.expiresAt <= new Date()
  )
    return null;
  return {
    workspaceId: row.workspace.id,
    userId: row.user.id,
    sessionId: row.session.id,
    identity: row.user.identity,
    name: row.user.name,
    csrf: row.session.csrf,
    brand: row.workspace.brand,
    expiresAt: row.workspace.expiresAt,
  };
}
export async function authenticate(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (req.auth) return next();
    const a = await getAuth(req);
    if (!a)
      fail(
        401,
        "SESSION_REQUIRED",
        "Start a new isolated demo session. Your previous session may have expired.",
      );
    req.auth = a;
    next();
  } catch (e) {
    next(e);
  }
}
export function auth(req: Request): Auth {
  return (req as AuthedRequest).auth!;
}
export function operator(req: Request, _res: Response, next: NextFunction) {
  if (auth(req).identity !== "operator")
    return next(
      Object.assign(new Error("Operator access required."), {
        status: 403,
        code: "FORBIDDEN",
      }),
    );
  next();
}
export function customer(a: Auth) {
  if (a.identity === "operator")
    fail(
      403,
      "CUSTOMER_REQUIRED",
      "Switch to a customer to complete this action.",
    );
}
export function csrf(req: Request, _res: Response, next: NextFunction) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("X-CSRF-Token") !== auth(req).csrf
  )
    return next(
      Object.assign(new Error("Session protection failed. Reload and retry."), {
        status: 403,
        code: "CSRF",
      }),
    );
  next();
}
export async function guard(tx: Tx, a: Auth) {
  const [w] = await tx
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, a.workspaceId))
    .for("update");
  const [s] = await tx
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, a.sessionId), eq(sessions.userId, a.userId)));
  if (
    !w ||
    w.state !== "active" ||
    w.expiresAt <= new Date() ||
    !s ||
    s.expiresAt <= new Date()
  )
    fail(401, "SESSION_EXPIRED", "The session is no longer active.");
  return w;
}
export async function issueSession(
  tx: Tx,
  workspaceId: string,
  userId: string,
  expiresAt: Date,
) {
  const token = randomBytes(32).toString("hex"),
    csrfToken = randomBytes(24).toString("hex");
  await tx.insert(sessions).values({
    workspaceId,
    userId,
    tokenHash: hash(token),
    csrf: csrfToken,
    expiresAt,
  });
  return { token, csrfToken };
}
export function setSession(res: Response, token: string, expiresAt: Date) {
  res.cookie("northstar_session", token, {
    ...cookieOptions,
    expires: expiresAt,
  });
}
export async function workspaceLock(tx: Tx, id: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id}))`);
}
