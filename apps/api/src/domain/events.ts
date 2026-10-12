import { and, eq } from "drizzle-orm";
import type { Tx } from "../db";
import { events, notifications, outbox, users } from "../db/schema";
export async function audit(
  tx: Tx,
  workspaceId: string,
  userId: string | null,
  type: string,
  entityId: string | null,
  detail: Record<string, unknown> = {},
  visibility = "public",
) {
  await tx
    .insert(events)
    .values({ workspaceId, userId, entityId, type, detail, visibility });
}
export async function notify(
  tx: Tx,
  workspaceId: string,
  entityId: string,
  type: string,
  customerId: string,
  dedupe?: string,
) {
  const identities = await tx
    .select()
    .from(users)
    .where(
      and(eq(users.workspaceId, workspaceId), eq(users.identity, "operator")),
    );
  const targets = [customerId, ...identities.map((u) => u.id)];
  await tx
    .insert(outbox)
    .values({ workspaceId, entityId, type, dedupe: dedupe || null })
    .onConflictDoNothing();
  await tx
    .insert(notifications)
    .values(
      targets.map((userId) => ({
        workspaceId,
        userId,
        entityId,
        type,
        dedupe: dedupe ? `${dedupe}:${userId}` : null,
      })),
    )
    .onConflictDoNothing();
}
