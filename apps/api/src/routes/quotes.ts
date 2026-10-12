import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { auth, authenticate, csrf, guard, hash, operator } from "../auth";
import { db } from "../db";
import { versions } from "../db/schema";
import { fail, missing } from "../domain/errors";
import { audit } from "../domain/events";
import {
  accept,
  accessibleQuote,
  compare,
  createRevision,
  decline,
  editDraft,
  sendRevision,
  versionsFor,
} from "../domain/quotes";
export const quotesRouter = Router();
quotesRouter.use(authenticate, csrf);
const id = (value: unknown) => z.uuid().parse(value);
quotesRouter.post("/leads/:id/quotes", operator, async (req, res) =>
  res
    .status(201)
    .json(await createRevision(auth(req), id(req.params.id), req.body.draft)),
);
quotesRouter.patch("/quotes/:id/draft", operator, async (req, res) =>
  res.json(
    await editDraft(
      auth(req),
      id(req.params.id),
      id(req.body.versionId),
      req.body.draft,
    ),
  ),
);
quotesRouter.post("/quotes/:id/send", operator, async (req, res) => {
  const { pdf: _pdf, ...v } = await sendRevision(
    auth(req),
    id(req.params.id),
    id(req.body.versionId),
  );
  res.json(v);
});
quotesRouter.get("/quotes/:id/versions", async (req, res) =>
  res.json({ items: await versionsFor(auth(req), id(req.params.id)) }),
);
quotesRouter.get("/quotes/:id/compare", async (req, res) =>
  res.json(
    await compare(
      auth(req),
      id(req.params.id),
      id(req.query.from),
      id(req.query.to),
    ),
  ),
);
quotesRouter.post("/quotes/:id/accept", async (req, res) => {
  const input = z
    .object({
      versionId: z.uuid(),
      optionId: z.string().max(80),
      checks: z.array(z.string()).max(4),
    })
    .strict()
    .parse(req.body);
  res.json(
    await accept(
      auth(req),
      id(req.params.id),
      input.versionId,
      input.optionId,
      input.checks,
    ),
  );
});
quotesRouter.post("/quotes/:id/decline", async (req, res) =>
  res.json(await decline(auth(req), id(req.params.id), id(req.body.versionId))),
);
quotesRouter.get("/quotes/:id/pdf", async (req, res) => {
  const a = auth(req),
    quoteId = id(req.params.id);
  await accessibleQuote(a, quoteId);
  const [v] = await db
    .select()
    .from(versions)
    .where(
      and(
        eq(versions.quoteId, quoteId),
        eq(versions.id, id(req.query.version)),
      ),
    );
  if (!v || v.status === "draft" || !v.pdf) missing();
  const buffer = await readFile(v.pdf.path).catch(() =>
    fail(
      503,
      "DOCUMENT_UNAVAILABLE",
      "The proposal document is temporarily unavailable.",
    ),
  );
  if (hash(buffer) !== v.pdf.hash)
    fail(
      503,
      "DOCUMENT_INTEGRITY",
      "The proposal document failed its integrity check.",
    );
  await db.transaction(async (tx) => {
    await guard(tx, a);
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "quote.pdf_downloaded",
      quoteId,
      { version: v.number },
      "private",
    );
  });
  res
    .set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${v.snapshot.leadReference}-v${v.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Document-SHA256": v.pdf.hash,
    })
    .send(buffer);
});
