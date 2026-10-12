import { and, eq, lte } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { db, pool } from "./db";
import { leads, quotes, sessions, versions, workspaces } from "./db/schema";
import { audit, notify } from "./domain/events";
import { env } from "./env";
export async function reconcile() {
  const candidates = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.state, "active"));
  for (const candidate of candidates)
    await db.transaction(async (tx) => {
      const [w] = await tx
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, candidate.id))
        .for("update", { skipLocked: true });
      if (!w || w.state !== "active") return;
      const now = new Date();
      if (w.expiresAt <= now) {
        await tx
          .update(workspaces)
          .set({ state: "expired", updatedAt: now })
          .where(eq(workspaces.id, w.id));
        await tx.delete(sessions).where(eq(sessions.workspaceId, w.id));
        return;
      }
      const due = await tx
        .select({ v: versions, q: quotes, l: leads })
        .from(versions)
        .innerJoin(quotes, eq(versions.quoteId, quotes.id))
        .innerJoin(leads, eq(quotes.leadId, leads.id))
        .where(
          and(
            eq(versions.workspaceId, w.id),
            eq(versions.status, "sent"),
            lte(versions.expiresAt, new Date(now.getTime() + 2 * 86400000)),
          ),
        );
      for (const { v, q, l } of due) {
        if (v.expiresAt! <= now) {
          await tx
            .update(versions)
            .set({ status: "expired", updatedAt: now })
            .where(eq(versions.id, v.id));
          await audit(tx, w.id, null, "quote.expired", q.id, {
            version: v.number,
          });
          await notify(
            tx,
            w.id,
            l.id,
            "quote.expired",
            l.customerId,
            `expired:${v.id}`,
          );
        } else
          await notify(
            tx,
            w.id,
            l.id,
            "quote.local_reminder",
            l.customerId,
            `reminder:${v.id}`,
          );
      }
    });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await reconcile();
    } catch {
      console.error("Northstar reconciliation failed; will retry.");
    } finally {
      running = false;
    }
  };
  await tick();
  const timer = setInterval(tick, env.WORKER_INTERVAL_MS);
  process.on("SIGTERM", async () => {
    clearInterval(timer);
    await pool.end();
    process.exit(0);
  });
  console.log(
    "Northstar durable local notification/expiry worker running. No external delivery.",
  );
}
