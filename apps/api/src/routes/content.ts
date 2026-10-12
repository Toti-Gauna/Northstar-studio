import {
  brandSchema,
  contentSchemas,
  defaultBrand,
  type ContentKind,
  type ServiceData,
} from "@northstar/contracts";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { auth, authenticate, csrf, getAuth, guard, operator } from "../auth";
import { db } from "../db";
import { catalog, sampleCases, sampleFaq } from "../db/catalog";
import { content, leads, workspaces } from "../db/schema";
import { fail, missing } from "../domain/errors";
import { audit } from "../domain/events";
export const publicRouter = Router();
publicRouter.get("/brand", async (req, res) => {
  const a = await getAuth(req);
  res.json(a?.brand || defaultBrand);
});
async function publicContent(
  req: Parameters<typeof getAuth>[0],
  kind: ContentKind,
) {
  const a = await getAuth(req);
  if (a) {
    const rows = await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.workspaceId, a.workspaceId),
          eq(content.kind, kind),
          eq(content.profile, a.brand.profile),
          eq(content.status, "published"),
        ),
      )
      .orderBy(content.createdAt, content.id);
    return rows.map((row) => ({
      id: row.id,
      revision: row.revision,
      data: row.published,
    }));
  }
  const items =
    kind === "service"
      ? catalog("digital")
      : kind === "case"
        ? sampleCases("digital")
        : sampleFaq("digital");
  return items.map((data, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    revision: 1,
    data,
  }));
}
publicRouter.get("/services", async (req, res) =>
  res.json({ items: await publicContent(req, "service") }),
);
publicRouter.get("/services/:id", async (req, res) => {
  const list = await publicContent(req, "service"),
    item = list.find((i) => i.id === req.params.id);
  if (!item) missing();
  res.json(item);
});
publicRouter.get("/cases", async (req, res) =>
  res.json({ items: await publicContent(req, "case") }),
);
publicRouter.get("/faq", async (req, res) =>
  res.json({ items: await publicContent(req, "faq") }),
);
export const cmsRouter = Router();
cmsRouter.use(authenticate, csrf, operator);
const kindSchema = z.enum(["service", "case", "faq", "template"]);
cmsRouter.get("/content", async (req, res) => {
  const a = auth(req),
    kind = kindSchema.parse(req.query.kind || "service");
  const rows = await db
    .select()
    .from(content)
    .where(and(eq(content.workspaceId, a.workspaceId), eq(content.kind, kind)))
    .orderBy(desc(content.updatedAt), content.id);
  res.json({ items: rows });
});
cmsRouter.post("/content", async (req, res) => {
  const a = auth(req),
    kind = kindSchema.parse(req.body.kind),
    data = contentSchemas[kind].parse(req.body.data);
  const row = await db.transaction(async (tx) => {
    const w = await guard(tx, a);
    const [item] = await tx
      .insert(content)
      .values({
        workspaceId: a.workspaceId,
        kind,
        profile: "profile" in data ? data.profile : w.brand.profile,
        draft: data,
      })
      .returning();
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "content.created",
      item.id,
      { kind },
      "private",
    );
    return item;
  });
  res.status(201).json(row);
});
cmsRouter.patch("/content/:id", async (req, res) => {
  const a = auth(req),
    id = z.uuid().parse(req.params.id);
  const result = await db.transaction(async (tx) => {
    await guard(tx, a);
    const [item] = await tx
      .select()
      .from(content)
      .where(and(eq(content.id, id), eq(content.workspaceId, a.workspaceId)));
    if (!item) missing();
    const data = contentSchemas[item.kind].parse(req.body.data);
    const [row] = await tx
      .update(content)
      .set({ draft: data, updatedAt: new Date() })
      .where(eq(content.id, id))
      .returning();
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "content.draft_saved",
      id,
      { kind: item.kind },
      "private",
    );
    return row;
  });
  res.json(result);
});
cmsRouter.get("/content/:id/preview", async (req, res) => {
  const [row] = await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.id, z.uuid().parse(req.params.id)),
        eq(content.workspaceId, auth(req).workspaceId),
      ),
    );
  if (!row) missing();
  res.json({
    id: row.id,
    revision: row.revision + 1,
    data: row.draft,
    preview: true,
  });
});
cmsRouter.post("/content/:id/publish", async (req, res) => {
  const a = auth(req),
    id = z.uuid().parse(req.params.id);
  const result = await db.transaction(async (tx) => {
    await guard(tx, a);
    const [item] = await tx
      .select()
      .from(content)
      .where(and(eq(content.id, id), eq(content.workspaceId, a.workspaceId)));
    if (!item) missing();
    const data = contentSchemas[item.kind].parse(item.draft);
    const revision = item.revision + 1;
    const [row] = await tx
      .update(content)
      .set({
        published: data,
        status: "published",
        revision,
        profile: "profile" in data ? data.profile : item.profile,
        history: [
          ...item.history,
          { revision, data, publishedAt: new Date().toISOString() },
        ],
        updatedAt: new Date(),
      })
      .where(eq(content.id, id))
      .returning();
    await audit(tx, a.workspaceId, a.userId, "content.published", id, {
      kind: item.kind,
      revision,
    });
    return row;
  });
  res.json(result);
});
cmsRouter.delete("/content/:id", async (req, res) => {
  const a = auth(req),
    id = z.uuid().parse(req.params.id);
  await db.transaction(async (tx) => {
    await guard(tx, a);
    const [item] = await tx
      .select()
      .from(content)
      .where(and(eq(content.id, id), eq(content.workspaceId, a.workspaceId)));
    if (!item) missing();
    await tx
      .update(content)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(content.id, id));
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "content.archived",
      id,
      { kind: item.kind },
      "private",
    );
  });
  res.json({ archived: true });
});
cmsRouter.get("/settings", async (req, res) => res.json(auth(req).brand));
const luminance = (hex: string) => {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const contrast = (a: string, b: string) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
cmsRouter.patch("/settings", async (req, res) => {
  const a = auth(req),
    brand = brandSchema.parse(req.body);
  if (
    contrast(brand.navy, brand.paper) < 4.5 ||
    contrast(brand.copper, brand.paper) < 4.5 ||
    contrast(brand.navy, "#FFFCF7") < 4.5 ||
    contrast(brand.paper, "#596575") < 4.5 ||
    contrast(brand.copper, "#FFFCF7") < 4.5
  )
    fail(
      422,
      "CONTRAST",
      "Text and accent must have at least 4.5:1 contrast against paper.",
    );
  const result = await db.transaction(async (tx) => {
    await guard(tx, a);
    await tx
      .update(workspaces)
      .set({ brand, updatedAt: new Date() })
      .where(eq(workspaces.id, a.workspaceId));
    const history = await tx
      .select({ id: leads.id, service: leads.service })
      .from(leads)
      .where(eq(leads.workspaceId, a.workspaceId));
    const incompatible = history.filter(
      (l) => (l.service.data as ServiceData).profile !== brand.profile,
    ).length;
    await audit(
      tx,
      a.workspaceId,
      a.userId,
      "settings.updated",
      a.workspaceId,
      { profile: brand.profile, currency: brand.currency },
      "private",
    );
    return {
      brand,
      incompatibleHistoricalRequests: incompatible,
      historyPreserved: true,
    };
  });
  res.json(result);
});
