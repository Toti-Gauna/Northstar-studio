import { eq, sum } from "drizzle-orm";
import { stat } from "node:fs/promises";
import type { Tx } from "../db";
import { attachments, versions } from "../db/schema";
import { env } from "../env";
import { fail } from "./errors";
export async function storageUsage(tx: Tx, workspaceId: string) {
  const [{ bytes }] = await tx
    .select({ bytes: sum(attachments.size) })
    .from(attachments)
    .where(eq(attachments.workspaceId, workspaceId));
  const rows = await tx
    .select({ pdf: versions.pdf })
    .from(versions)
    .where(eq(versions.workspaceId, workspaceId));
  let total = Number(bytes || 0);
  for (const row of rows)
    if (row.pdf) {
      total +=
        row.pdf.size ?? (await stat(row.pdf.path).catch(() => null))?.size ?? 0;
    }
  return total;
}
// Caller holds the workspace command lock, so uploads and sends cannot race this budget.
export async function requireStorageBudget(
  tx: Tx,
  workspaceId: string,
  additionalBytes: number,
) {
  if (
    (await storageUsage(tx, workspaceId)) + additionalBytes >
    env.DEMO_STORAGE_BYTES
  )
    fail(
      429,
      "STORAGE_LIMIT",
      "This workspace has reached its private file storage limit.",
    );
}
