import type { BriefInput, Service } from "@northstar/contracts";
import { count, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../apps/api/src/app";
import { db, pool } from "../apps/api/src/db";
import * as schema from "../apps/api/src/db/schema";
import { draftFromSnapshot } from "../apps/api/src/domain/quotes";
import { env } from "../apps/api/src/env";
import { reconcile } from "../apps/api/src/worker";
type Client = { cookie: string; csrf: string; me: any };
let origin: string,
  server: ReturnType<typeof app.listen>,
  a: Client,
  b: Client,
  leadId: string,
  quoteId: string,
  v1: any,
  v2: any,
  v3: any,
  projectId: string,
  fileId: string,
  input: BriefInput,
  service: Service,
  pdfV1: Buffer,
  pdfV2: Buffer;
const workspaces: string[] = [];
async function call(
  c: Client,
  path: string,
  method = "GET",
  body?: unknown,
  expected = 200,
  key?: string,
) {
  const headers: Record<string, string> = {
    Origin: env.WEB_ORIGIN,
    Cookie: c.cookie,
    "X-CSRF-Token": c.csrf,
    "X-Northstar-Demo": "1",
  };
  if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (key) headers["Idempotency-Key"] = key;
  const r = await fetch(origin + path, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const cookie = r.headers.get("set-cookie");
  if (cookie) c.cookie = cookie.split(";")[0];
  const data = r.headers.get("content-type")?.includes("application/json")
    ? await r.json()
    : Buffer.from(await r.arrayBuffer());
  expect(r.status, JSON.stringify(data)).toBe(expected);
  return data;
}
async function start(): Promise<Client> {
  const c = { cookie: "", csrf: "", me: null };
  await call(c, "/demo/session", "POST", {}, 201);
  c.me = await call(c, "/me");
  c.csrf = c.me.csrfToken;
  workspaces.push(c.me.workspaceId);
  return c;
}
async function role(c: Client, identity: string) {
  await call(c, "/demo/switch-role", "POST", { identity });
  c.me = await call(c, "/me");
  c.csrf = c.me.csrfToken;
}
beforeAll(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address() as { port: number };
  origin = `http://127.0.0.1:${address.port}`;
  a = await start();
  b = await start();
  service = (await call(a, "/public/services")).items.find(
    (s: any) => s.data.name.en === "Brand & direction",
  );
  input = {
    serviceId: service.id,
    packageId: "considered",
    quantity100: 125,
    addonIds: ["workshop"],
    currency: "USD",
    title: "Integration continuity brief",
    name: "Synthetic customer",
    email: "same@northstar.example",
    answers: {
      goal: "Verify one continuous workflow",
      existing: "Synthetic material",
      coordination: "No",
    },
    source: "cold-email",
    channel: "test",
    campaign: "acceptance-suite",
    attachmentIds: [],
  };
});
afterAll(async () => {
  for (const id of workspaces)
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id));
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
describe.sequential(
  "PostgreSQL API acceptance, ownership and concurrency",
  () => {
    it("stores a private synthetic attachment and rejects invalid/oversized files", async () => {
      const form = new FormData();
      form.append(
        "file",
        new Blob(["Synthetic brief reference\n"], { type: "text/plain" }),
        "synthetic.txt",
      );
      const file = await call(a, "/attachments", "POST", form, 201);
      fileId = file.id;
      input.attachmentIds = [fileId];
      const bad = new FormData();
      bad.append(
        "file",
        new Blob(["<script>bad</script>"], { type: "text/plain" }),
        "bad.txt",
      );
      await call(a, "/attachments", "POST", bad, 422);
      const big = new FormData();
      big.append(
        "file",
        new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "text/plain" }),
        "big.txt",
      );
      await call(a, "/attachments", "POST", big, 413);
    });
    it("submits once on concurrent retries and rejects reused key with different payload", async () => {
      const key = randomUUID(),
        results = await Promise.all([
          call(a, "/leads", "POST", input, 201, key),
          call(a, "/leads", "POST", input, 201, key),
        ]);
      expect(results[0].id).toBe(results[1].id);
      leadId = results[0].id;
      await call(
        a,
        "/leads",
        "POST",
        { ...input, title: "Changed payload" },
        409,
        key,
      );
      const customerList = await call(a, "/me/requests?search=Integration");
      expect(customerList.items.map((l: any) => l.id)).toEqual([leadId]);
    });
    it("persists private drafts; ignores browser totals by rejecting unrecognized fields", async () => {
      await call(a, "/me/brief-draft", "PUT", {
        title: "Private saved draft",
        serviceId: service.id,
        answers: { goal: "Draft" },
      });
      expect((await call(a, "/me/brief-draft")).data.title).toBe(
        "Private saved draft",
      );
      await call(
        a,
        "/leads",
        "POST",
        { ...input, totalMinor: 1 },
        422,
        randomUUID(),
      );
      const e = await call(a, "/estimates", "POST", {
        serviceId: input.serviceId,
        packageId: input.packageId,
        quantity100: input.quantity100,
        addonIds: input.addonIds,
        currency: input.currency,
      });
      expect(e.totals.totalMinor).toBe(445000);
    });
    it("same email from a different customer creates a distinct request; cannot read A records", async () => {
      await role(a, "customer-2");
      const other = await call(
        a,
        "/leads",
        "POST",
        { ...input, attachmentIds: [] },
        201,
        randomUUID(),
      );
      expect(other.id).not.toBe(leadId);
      await call(a, `/leads/${leadId}`, "GET", undefined, 404);
      await call(a, `/attachments/${fileId}/download`, "GET", undefined, 404);
      expect((await call(a, "/me/brief-draft")).data).toBeNull();
      await role(a, "customer");
    });
    it("operator sees the exact submitted ID after reading again, qualifies and sends immutable V1", async () => {
      await role(a, "operator");
      const list = await call(a, "/operator/leads?search=Integration");
      expect(list.items.some((l: any) => l.id === leadId)).toBe(true);
      await call(a, `/leads/${leadId}/transitions`, "POST", {
        to: "qualified",
      });
      const created = await call(a, `/leads/${leadId}/quotes`, "POST", {}, 201);
      quoteId = created.quote.id;
      v1 = created.version;
      expect(v1.snapshot.options[0].totals.totalMinor).toBe(445000);
      await call(
        a,
        `/leads/${leadId}/comments`,
        "POST",
        { body: "Internal note: never exported", visibility: "private" },
        201,
      );
      v1 = await call(a, `/quotes/${quoteId}/send`, "POST", {
        versionId: v1.id,
      });
      expect(v1.status).toBe("sent");
      await call(
        a,
        `/quotes/${quoteId}/draft`,
        "PATCH",
        { versionId: v1.id, draft: draftFromSnapshot(v1.snapshot) },
        409,
      );
      pdfV1 = await call(a, `/quotes/${quoteId}/pdf?version=${v1.id}`);
      expect(pdfV1.subarray(0, 5).toString()).toBe("%PDF-");
    });
    it("customer only sees public comments and cannot read another workspace or operator CMS", async () => {
      await role(a, "customer");
      let detail = await call(a, `/leads/${leadId}`);
      expect(detail.comments).toHaveLength(0);
      await call(
        a,
        `/leads/${leadId}/comments`,
        "POST",
        { body: "Please add a documented workshop", visibility: "public" },
        201,
      );
      detail = await call(a, `/leads/${leadId}`);
      expect(detail.comments).toHaveLength(1);
      expect(
        (await call(a, "/activity")).items.some(
          (e: any) => e.visibility === "private",
        ),
      ).toBe(false);
      await call(a, "/operator/content?kind=service", "GET", undefined, 403);
      await call(b, `/leads/${leadId}`, "GET", undefined, 404);
      await call(b, `/quotes/${quoteId}/versions`, "GET", undefined, 404);
      await call(
        b,
        `/quotes/${quoteId}/pdf?version=${v1.id}`,
        "GET",
        undefined,
        404,
      );
      await call(b, `/attachments/${fileId}/download`, "GET", undefined, 404);
    });
    it("new draft recalculates on server; sends V2, compares actual changes and supersedes V1", async () => {
      await role(a, "operator");
      const created = await call(a, `/leads/${leadId}/quotes`, "POST", {}, 201);
      v2 = created.version;
      const draft = draftFromSnapshot(v2.snapshot);
      draft.options[0].lines.push({
        id: "extra",
        label: "Additional documented workshop",
        quantity100: 100,
        unitMinor: 50000,
      });
      draft.options[0].scope.excluded.push("External messaging");
      draft.options[0].days += 3;
      draft.options.push({
        ...structuredClone(draft.options[0]),
        id: "alternative",
        name: "Extended alternative",
        lines: [
          ...draft.options[0].lines,
          {
            id: "extended",
            label: "Extended review",
            quantity100: 100,
            unitMinor: 25000,
          },
        ],
      });
      const edited = await call(a, `/quotes/${quoteId}/draft`, "PATCH", {
        versionId: v2.id,
        draft,
      });
      expect(edited.snapshot.options[0].totals.totalMinor).toBe(495000);
      v2 = await call(a, `/quotes/${quoteId}/send`, "POST", {
        versionId: v2.id,
      });
      const diff = await call(
        a,
        `/quotes/${quoteId}/compare?from=${v1.id}&to=${v2.id}`,
      );
      expect(diff.options[0].deltaMinor).toBe(50000);
      expect(diff.options[0].scopeChanged).toBe(true);
      expect(diff.options[0].daysDelta).toBe(3);
      v3 = (await call(a, `/leads/${leadId}/quotes`, "POST", {}, 201)).version;
      pdfV2 = await call(a, `/quotes/${quoteId}/pdf?version=${v2.id}`);
      await role(a, "customer");
      await call(
        a,
        `/quotes/${quoteId}/accept`,
        "POST",
        {
          versionId: v1.id,
          optionId: "primary",
          checks: ["scope", "exclusions", "responsibilities", "terms"],
        },
        409,
      );
    });
    it("wrong user, expired proposal and unread critical scope cannot be accepted", async () => {
      await role(a, "customer-2");
      await call(
        a,
        `/quotes/${quoteId}/accept`,
        "POST",
        {
          versionId: v2.id,
          optionId: "primary",
          checks: ["scope", "exclusions", "responsibilities", "terms"],
        },
        404,
      );
      const own = await call(a, "/me/requests");
      const expiredLead = own.items.find(
        (l: any) => l.reference === "NS-DEMO-005",
      );
      const detail = await call(a, `/leads/${expiredLead.id}`);
      const expired = (await call(a, `/quotes/${detail.quoteId}/versions`))
        .items[0];
      await call(
        a,
        `/quotes/${detail.quoteId}/accept`,
        "POST",
        {
          versionId: expired.id,
          optionId: "primary",
          checks: ["scope", "exclusions", "responsibilities", "terms"],
        },
        409,
      );
      await role(a, "customer");
      await call(
        a,
        `/quotes/${quoteId}/accept`,
        "POST",
        { versionId: v2.id, optionId: "primary", checks: [] },
        422,
      );
      await call(
        a,
        `/quotes/${quoteId}/accept`,
        "POST",
        {
          versionId: v2.id,
          optionId: "fake",
          checks: ["scope", "exclusions", "responsibilities", "terms"],
        },
        422,
      );
    });
    it("concurrent repeated acceptance records one exact option and creates one project with six tasks", async () => {
      const body = {
        versionId: v2.id,
        optionId: "alternative",
        checks: ["scope", "exclusions", "responsibilities", "terms"],
      };
      const results = await Promise.all([
        call(a, `/quotes/${quoteId}/accept`, "POST", body),
        call(a, `/quotes/${quoteId}/accept`, "POST", body),
        call(a, `/quotes/${quoteId}/accept`, "POST", body),
      ]);
      projectId = results[0].project.id;
      expect(new Set(results.map((r) => r.project.id)).size).toBe(1);
      expect(results[0].acceptance.optionId).toBe("alternative");
      const p = await call(a, `/projects/${projectId}`);
      expect(p.milestones).toHaveLength(3);
      expect(p.milestones.flatMap((m: any) => m.tasks)).toHaveLength(6);
      const [{ total }] = await db
        .select({ total: count() })
        .from(schema.projects)
        .where(eq(schema.projects.leadId, leadId));
      expect(total).toBe(1);
      await call(
        a,
        `/quotes/${quoteId}/accept`,
        "POST",
        { ...body, optionId: "primary" },
        409,
      );
      await call(b, `/projects/${projectId}`, "GET", undefined, 404);
    });
    it("task ownership is enforced; accepted proposals cannot be reopened or resent", async () => {
      const p = await call(a, `/projects/${projectId}`),
        provider = p.milestones[0].tasks.find(
          (t: any) => t.owner === "operator",
        ),
        client = p.milestones[0].tasks.find((t: any) => t.owner === "customer");
      await call(a, `/tasks/${provider.id}`, "PATCH", { status: "done" }, 403);
      await call(a, `/tasks/${client.id}`, "PATCH", { status: "done" });
      await role(a, "operator");
      await call(a, `/leads/${leadId}/quotes`, "POST", {}, 409);
      await call(
        a,
        `/quotes/${quoteId}/draft`,
        "PATCH",
        { versionId: v3.id, draft: draftFromSnapshot(v3.snapshot) },
        409,
      );
      await call(
        a,
        `/quotes/${quoteId}/send`,
        "POST",
        { versionId: v3.id },
        409,
      );
      await call(
        a,
        `/quotes/${quoteId}/send`,
        "POST",
        { versionId: v2.id },
        409,
      );
      await call(
        a,
        `/leads/${leadId}/transitions`,
        "POST",
        { to: "qualified" },
        409,
      );
    });
    it("CMS drafts stay private, publish affects public API immediately; PDF bytes stay identical", async () => {
      const row = (await call(a, "/operator/content?kind=service")).items.find(
        (x: any) => x.id === service.id,
      );
      row.draft.name.en = "Published from static CMS";
      row.draft.packages[0].prices.USD += 99999;
      await call(a, `/operator/content/${service.id}`, "PATCH", {
        data: row.draft,
      });
      expect(
        (await call(a, `/public/services/${service.id}`)).data.name.en,
      ).not.toBe(row.draft.name.en);
      await call(a, `/operator/content/${service.id}/publish`, "POST", {});
      expect(
        (await call(a, `/public/services/${service.id}`)).data.name.en,
      ).toBe(row.draft.name.en);
      expect(await call(a, `/quotes/${quoteId}/pdf?version=${v1.id}`)).toEqual(
        pdfV1,
      );
      expect(await call(a, `/quotes/${quoteId}/pdf?version=${v2.id}`)).toEqual(
        pdfV2,
      );
      await expect(
        db.execute(
          sql`update quote_versions set snapshot = '{}'::jsonb where id = ${v1.id}`,
        ),
      ).rejects.toThrow();
    });
    it("brand/sector/currency changes preserve history and do not alter another workspace", async () => {
      const otherBrand = await call(b, "/public/brand"),
        settings = {
          ...a.me.brand,
          name: "Studio Meridian",
          locale: "es",
          currency: "ARS",
          profile: "architecture",
        };
      const saved = await call(a, "/operator/settings", "PATCH", settings);
      expect(saved.incompatibleHistoricalRequests).toBeGreaterThan(0);
      expect((await call(a, "/public/services")).items).toHaveLength(3);
      expect((await call(a, `/leads/${leadId}`)).service.data.profile).toBe(
        "digital",
      );
      expect((await call(b, "/public/brand")).name).toBe(otherBrand.name);
      expect(await call(a, `/quotes/${quoteId}/pdf?version=${v2.id}`)).toEqual(
        pdfV2,
      );
    });
    it("reconciliation delivers a durable reminder once across repeated worker runs", async () => {
      const list = await call(a, "/operator/leads?status=qualified");
      const lead = list.items.find((l: any) => l.reference === "NS-DEMO-009");
      const created = await call(
        a,
        `/leads/${lead.id}/quotes`,
        "POST",
        {},
        201,
      );
      const draft = draftFromSnapshot(created.version.snapshot);
      draft.validDays = 1;
      await call(a, `/quotes/${created.quote.id}/draft`, "PATCH", {
        versionId: created.version.id,
        draft,
      });
      await call(a, `/quotes/${created.quote.id}/send`, "POST", {
        versionId: created.version.id,
      });
      await reconcile();
      await reconcile();
      const out = await db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.dedupe, `reminder:${created.version.id}`));
      const inbox = await db
        .select()
        .from(schema.notifications)
        .where(
          sql`${schema.notifications.dedupe} like ${`reminder:${created.version.id}:%`}`,
        );
      expect(out).toHaveLength(1);
      expect(inbox).toHaveLength(2);
      expect(out[0].status).toBe("local-delivered");
      const activity = await call(a, `/activity?entity=${leadId}`);
      expect(
        activity.items.some((event: any) => event.type === "quote.accepted"),
      ).toBe(true);
      expect(
        activity.items.some((event: any) => event.type === "project.created"),
      ).toBe(true);
    });
    it("analytics use workspace events, local outbox is honest, server role escalation is forbidden", async () => {
      const analytics = await call(a, "/analytics");
      expect(analytics.demo).toBe(true);
      expect(
        analytics.counts.find((x: any) => x.type === "lead.created").count,
      ).toBe(14);
      expect((await call(a, "/outbox")).externalDelivery).toBe("not-sent");
      await call(a, "/demo/switch-role", "POST", { identity: "owner" }, 422);
      await call(a, "/owner", "GET", undefined, 403);
    });
    it("storage quota counts immutable proposal PDFs as well as attachments", async () => {
      const previous = env.DEMO_STORAGE_BYTES;
      const { storageUsage } = await import("../apps/api/src/domain/storage");
      const used = await db.transaction((tx) =>
        storageUsage(tx, a.me.workspaceId),
      );
      expect(used).toBeGreaterThan(1000);
      try {
        env.DEMO_STORAGE_BYTES = used;
        const file = new FormData();
        file.append(
          "file",
          new Blob(["Synthetic quota check"], { type: "text/plain" }),
          "quota.txt",
        );
        await call(a, "/attachments", "POST", file, 429);
      } finally {
        env.DEMO_STORAGE_BYTES = previous;
      }
    });
    it("Origin/CSRF are required; reset/TTL invalidate old sessions without affecting B", async () => {
      const r = await fetch(origin + "/demo/session", {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "X-Northstar-Demo": "1",
        },
      });
      expect(r.status).toBe(403);
      const badCsrf = { ...a, csrf: "wrong" };
      await call(badCsrf, "/demo/reset", "POST", {}, 403);
      const old = { ...a };
      await call(a, "/demo/reset", "POST", {});
      await call(old, `/leads/${leadId}`, "GET", undefined, 401);
      expect((await call(b, "/me")).workspaceId).toBe(b.me.workspaceId);
      await db
        .update(schema.workspaces)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(schema.workspaces.id, b.me.workspaceId));
      await call(b, "/me", "GET", undefined, 401);
      await reconcile();
      const [w] = await db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, b.me.workspaceId));
      expect(w.state).toBe("expired");
    });
  },
);
