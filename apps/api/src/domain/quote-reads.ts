import { and, desc, eq } from "drizzle-orm";
import { type Auth } from "../auth";
import { db, type Tx } from "../db";
import { quotes, versions } from "../db/schema";
import { fail, missing } from "./errors";
import { accessibleLead } from "./leads";

export async function accessibleQuote(
  a: Auth,
  id: string,
  connection: Tx | typeof db = db,
) {
  const [q] = await connection
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.workspaceId, a.workspaceId)));
  if (!q) missing();
  const lead = await accessibleLead(a, q.leadId, connection);
  return { quote: q, lead };
}

export async function versionsFor(a: Auth, quoteId: string) {
  await accessibleQuote(a, quoteId);
  const rows = await db
    .select()
    .from(versions)
    .where(
      and(
        eq(versions.quoteId, quoteId),
        a.identity === "operator" ? undefined : undefined,
      ),
    )
    .orderBy(desc(versions.number));
  return rows
    .filter((v) => a.identity === "operator" || v.status !== "draft")
    .map(({ pdf: _pdf, ...v }) => ({
      ...v,
      status:
        v.status === "sent" && v.expiresAt && v.expiresAt < new Date()
          ? "expired"
          : v.status,
    }));
}

export async function compare(
  a: Auth,
  quoteId: string,
  from: string,
  to: string,
) {
  const all = await versionsFor(a, quoteId);
  const first = all.find((v) => v.id === from),
    second = all.find((v) => v.id === to);
  if (!first || !second) missing();
  if (first.snapshot.currency !== second.snapshot.currency)
    fail(
      422,
      "CURRENCY_MISMATCH",
      "Versions in different currencies cannot be compared.",
    );
  const optionIds = [
    ...new Set(
      [...first.snapshot.options, ...second.snapshot.options].map((o) => o.id),
    ),
  ];
  return {
    from: first,
    to: second,
    options: optionIds.map((id) => {
      const before = first.snapshot.options.find((o) => o.id === id),
        after = second.snapshot.options.find((o) => o.id === id);
      const ids = [
        ...new Set(
          [...(before?.lines || []), ...(after?.lines || [])].map((l) => l.id),
        ),
      ];
      return {
        id,
        before,
        after,
        deltaMinor:
          (after?.totals.totalMinor || 0) - (before?.totals.totalMinor || 0),
        scopeChanged:
          JSON.stringify(before?.scope) !== JSON.stringify(after?.scope),
        daysDelta: (after?.days || 0) - (before?.days || 0),
        lines: ids.map((lineId) => {
          const b = before?.lines.find((l) => l.id === lineId),
            n = after?.lines.find((l) => l.id === lineId);
          return {
            id: lineId,
            before: b,
            after: n,
            changed: JSON.stringify(b) !== JSON.stringify(n),
          };
        }),
      };
    }),
  };
}
