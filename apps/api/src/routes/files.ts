import { and, count, eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { auth, authenticate, csrf, guard, hash } from "../auth";
import { db } from "../db";
import { attachments } from "../db/schema";
import { fail, missing } from "../domain/errors";
import { audit } from "../domain/events";
import { requireStorageBudget } from "../domain/storage";
import { validateDocument } from "../domain/file-validation";
import { accessibleLead } from "../domain/leads";
import { env } from "../env";
import { requestLimit } from "../limits";
export const filesRouter = Router();
filesRouter.use(authenticate, csrf);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
});
export function inspectFile(buffer: Buffer, filename: string, mime: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".txt" && mime === "text/plain") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      fail(422, "INVALID_FILE", "Text must be valid UTF-8.");
    }
    if (
      /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text!) ||
      /<\s*(script|html|iframe)|javascript:/i.test(text!)
    )
      fail(
        422,
        "INVALID_FILE",
        "Upload a plain-text reference, without executable content.",
      );
  } else if (ext === ".pdf" && mime === "application/pdf") {
    const text = buffer.toString("latin1");
    if (
      !text.startsWith("%PDF-") ||
      !text.includes("%%EOF") ||
      /\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)\b/i.test(text)
    )
      fail(
        422,
        "INVALID_FILE",
        "Use a passive PDF document without scripts or embedded files.",
      );
  } else if (ext === ".png" && mime === "image/png") {
    if (
      buffer.length < 24 ||
      !buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      buffer.readUInt32BE(16) > 6000 ||
      buffer.readUInt32BE(20) > 6000 ||
      buffer.readUInt32BE(16) * buffer.readUInt32BE(20) > 16000000
    )
      fail(
        422,
        "INVALID_FILE",
        "Use a valid PNG up to 6000 pixels per side and 16 million pixels total.",
      );
  } else
    fail(
      422,
      "INVALID_FILE",
      "Allowed formats: plain UTF-8 text, passive PDF and PNG. Maximum 2 MB.",
    );
}
filesRouter.post(
  "/attachments",
  requestLimit(30),
  upload.single("file"),
  async (req, res) => {
    const a = auth(req),
      file = req.file;
    if (!file || !file.size)
      fail(422, "FILE_REQUIRED", "Choose a non-empty reference document.");
    inspectFile(file.buffer, file.originalname, file.mimetype);
    await validateDocument(file.buffer, file.mimetype);
    const filename =
      path
        .basename(file.originalname.replaceAll("\\", "/"))
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 120) || "reference.txt";
    const id = randomUUID(),
      dir = path.resolve(env.STORAGE_DIR, "attachments"),
      location = path.join(dir, id);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    let written = false;
    try {
      const result = await db.transaction(async (tx) => {
        await guard(tx, a);
        const [{ total }] = await tx
          .select({ total: count() })
          .from(attachments)
          .where(eq(attachments.workspaceId, a.workspaceId));
        if (total >= env.DEMO_MAX_FILES)
          fail(
            429,
            "STORAGE_LIMIT",
            "This workspace has reached its file limit.",
          );
        await requireStorageBudget(tx, a.workspaceId, file.size);
        await writeFile(location, file.buffer, { flag: "wx", mode: 0o600 });
        written = true;
        const [row] = await tx
          .insert(attachments)
          .values({
            id,
            workspaceId: a.workspaceId,
            userId: a.userId,
            filename,
            mime: file.mimetype,
            size: file.size,
            path: location,
            hash: hash(file.buffer),
          })
          .returning();
        await audit(
          tx,
          a.workspaceId,
          a.userId,
          "attachment.created",
          id,
          {},
          "private",
        );
        return {
          id: row.id,
          filename: row.filename,
          mime: row.mime,
          size: row.size,
        };
      });
      res.status(201).json(result);
    } catch (e) {
      if (written) await unlink(location).catch(() => {});
      throw e;
    }
  },
);
filesRouter.get("/attachments/:id/download", async (req, res) => {
  const a = auth(req);
  const [file] = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.workspaceId, a.workspaceId),
        eq(attachments.id, z.uuid().parse(req.params.id)),
      ),
    );
  if (!file) missing();
  if (a.identity !== "operator" && file.userId !== a.userId) {
    if (!file.leadId) missing();
    await accessibleLead(a, file.leadId);
  }
  const buffer = await readFile(file.path).catch(() =>
    fail(
      503,
      "FILE_UNAVAILABLE",
      "This attachment is temporarily unavailable.",
    ),
  );
  if (hash(buffer) !== file.hash)
    fail(503, "FILE_INTEGRITY", "The attachment failed its integrity check.");
  await db.transaction(async (tx) => {
    await guard(tx, a);
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "attachment.downloaded",
      file.id,
      {},
      "private",
    );
  });
  res
    .set({
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    })
    .send(buffer);
});
