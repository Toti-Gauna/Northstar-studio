import {
  defaultBrand,
  totals,
  type BrandSettings,
  type BriefInput,
  type Profile,
  type QuoteSnapshot,
  type Service,
} from "@northstar/contracts";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hash } from "../auth";
import { estimate } from "../domain/estimates";
import { audit, notify } from "../domain/events";
import { generatePdf } from "../domain/pdf";
import { defaultDraft } from "../domain/quotes";
import { env } from "../env";
import { catalog, sampleCases, sampleFaq } from "./catalog";
import { db, type Tx } from "./index";
import * as s from "./schema";
export async function seedWorkspace(
  tx: Tx,
  brand: BrandSettings = defaultBrand,
) {
  const [w] = await tx
    .insert(s.workspaces)
    .values({
      brand,
      expiresAt: new Date(Date.now() + env.DEMO_TTL_HOURS * 3600000),
    })
    .returning();
  const identities = await tx
    .insert(s.users)
    .values(
      [
        { identity: "customer" as const, name: "Alex Morgan" },
        { identity: "customer-2" as const, name: "Sam Rivera" },
        { identity: "customer-3" as const, name: "Jordan Lee" },
        { identity: "operator" as const, name: "Studio operator" },
      ].map((u) => ({ ...u, workspaceId: w.id })),
    )
    .returning();
  const serviceRows: Service[] = [];
  for (const profile of ["digital", "architecture", "technical"] as Profile[]) {
    for (const data of catalog(profile)) {
      const [row] = await tx
        .insert(s.content)
        .values({
          workspaceId: w.id,
          kind: "service",
          profile,
          draft: data,
          published: data,
          status: "published",
          revision: 1,
          history: [{ revision: 1, data }],
        })
        .returning();
      if (profile === brand.profile)
        serviceRows.push({ id: row.id, revision: 1, data });
    }
    for (const data of sampleCases(profile))
      await tx.insert(s.content).values({
        workspaceId: w.id,
        kind: "case",
        profile,
        draft: data,
        published: data,
        status: "published",
        revision: 1,
      });
    for (const data of sampleFaq(profile))
      await tx.insert(s.content).values({
        workspaceId: w.id,
        kind: "faq",
        profile,
        draft: data,
        published: data,
        status: "published",
        revision: 1,
      });
  }
  const draft = defaultDraft(
    serviceRows[0],
    brand.currency,
    undefined,
    brand.locale,
  );
  await tx.insert(s.content).values({
    workspaceId: w.id,
    kind: "template",
    profile: brand.profile,
    status: "published",
    revision: 1,
    draft: {
      name: "Discovery block",
      currency: brand.currency,
      lines: draft.options[0].lines,
      scope: draft.options[0].scope,
    },
    published: {
      name: "Discovery block",
      currency: brand.currency,
      lines: draft.options[0].lines,
      scope: draft.options[0].scope,
    },
  });
  const seeded = [];
  for (let i = 0; i < 12; i++) {
    const user = identities[i % 3],
      service = serviceRows[i % 3];
    const brief: BriefInput = {
      serviceId: service.id,
      packageId: service.data.packages[0].id,
      currency: brand.currency,
      quantity100: 100,
      addonIds: [],
      title:
        [
          "A clearer service website",
          "A new direction for the studio",
          "A structured operational handoff",
        ][i % 3] + ` · ${String(i + 1).padStart(2, "0")}`,
      name: user.name,
      email: `client${(i % 3) + 1}@northstar.example`,
      answers: {
        goal: "Make the work understandable and easy to review.",
        existing: "Synthetic reference materials.",
        coordination: "No",
      },
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      source: ["website", "lead", "cold-email", "referral", "in-person"][
        i % 5
      ] as BriefInput["source"],
      channel: "demo-seed",
      campaign: "sample-workspace",
      attachmentIds: [],
    };
    const status = [
      "new",
      "quoted",
      "quoted",
      "won",
      "quoted",
      "qualified",
      "lost",
      "new",
      "qualified",
      "new",
      "new",
      "qualified",
    ][i];
    const [lead] = await tx
      .insert(s.leads)
      .values({
        workspaceId: w.id,
        customerId: user.id,
        reference: `NS-DEMO-${String(i + 1).padStart(3, "0")}`,
        title: brief.title,
        status,
        brief,
        service,
        estimate: estimate(service, brief),
        createdAt: new Date(Date.now() - (12 - i) * 3600000),
      })
      .returning();
    seeded.push(lead);
    await audit(tx, w.id, user.id, "lead.created", lead.id, {
      source: brief.source,
      channel: brief.channel,
      campaign: brief.campaign,
      demoSeed: true,
    });
  }
  for (const i of [1, 2, 3, 4, 5]) {
    const lead = seeded[i];
    const [quote] = await tx
      .insert(s.quotes)
      .values({ workspaceId: w.id, leadId: lead.id })
      .returning();
    for (let n = 1; n <= (i === 2 ? 2 : 1); n++) {
      const d = defaultDraft(
        lead.service,
        brand.currency,
        undefined,
        brand.locale,
      );
      if (n === 2)
        d.options[0].lines.push({
          id: "workshop",
          label: "Scope workshop",
          quantity100: 100,
          unitMinor: 45000,
        });
      const snapshot: QuoteSnapshot = {
        ...d,
        brand,
        service: lead.service,
        leadReference: lead.reference,
        customerName: (lead.brief as BriefInput).name,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        options: d.options.map((o) => ({
          ...o,
          totals: totals(o.lines, d.discountBps, d.taxBps),
        })),
      };
      const id = randomUUID(),
        status =
          i === 3
            ? "accepted"
            : i === 4
              ? "expired"
              : i === 5
                ? "draft"
                : i === 2 && n === 1
                  ? "superseded"
                  : "sent";
      const sentAt =
          status === "draft" ? null : new Date(Date.now() - 2 * 86400000),
        expiresAt =
          status === "draft"
            ? null
            : new Date(
                Date.now() + (status === "expired" ? -1 : 12) * 86400000,
              );
      const pdf = sentAt ? await generatePdf(snapshot, id, n, sentAt) : null;
      await tx.insert(s.versions).values({
        id,
        workspaceId: w.id,
        quoteId: quote.id,
        number: n,
        status,
        snapshot,
        snapshotHash:
          status === "draft" ? null : hash(JSON.stringify(snapshot)),
        sentAt,
        expiresAt,
        pdf,
      });
      if (sentAt)
        await audit(tx, w.id, null, "quote.sent", quote.id, {
          version: n,
          demoSeed: true,
        });
      if (status === "accepted") {
        const option = snapshot.options[0];
        const [acceptance] = await tx
          .insert(s.acceptances)
          .values({
            workspaceId: w.id,
            quoteId: quote.id,
            versionId: id,
            userId: lead.customerId,
            optionId: option.id,
            amountMinor: option.totals.totalMinor,
            currency: brand.currency,
            snapshotHash: hash(JSON.stringify(snapshot)),
          })
          .returning();
        const [project] = await tx
          .insert(s.projects)
          .values({
            workspaceId: w.id,
            leadId: lead.id,
            acceptanceId: acceptance.id,
            customerId: lead.customerId,
            title: lead.title,
            option,
          })
          .returning();
        for (const [position, m] of lead.service.data.milestones.entries()) {
          const [milestone] = await tx
            .insert(s.milestones)
            .values({
              workspaceId: w.id,
              projectId: project.id,
              title: m.title,
              position,
            })
            .returning();
          await tx.insert(s.tasks).values(
            m.tasks.map((t) => ({
              ...t,
              workspaceId: w.id,
              projectId: project.id,
              milestoneId: milestone.id,
            })),
          );
        }
        await audit(tx, w.id, lead.customerId, "quote.accepted", quote.id, {
          version: n,
          optionId: option.id,
          demoSeed: true,
        });
        await audit(tx, w.id, lead.customerId, "project.created", project.id, {
          demoSeed: true,
        });
      }
    }
    if (i !== 5) await notify(tx, w.id, lead.id, "quote.sent", lead.customerId);
  }
  const lead = seeded[0],
    buffer = Buffer.from(
      "Northstar synthetic brief reference. No real client information.\n",
    );
  const dir = path.resolve(env.STORAGE_DIR, "attachments");
  await mkdir(dir, { recursive: true });
  const id = randomUUID(),
    location = path.join(dir, id);
  await writeFile(location, buffer);
  await tx.insert(s.attachments).values({
    id,
    workspaceId: w.id,
    userId: lead.customerId,
    leadId: lead.id,
    filename: "synthetic-reference.txt",
    mime: "text/plain",
    size: buffer.length,
    path: location,
    hash: hash(buffer),
  });
  await audit(tx, w.id, null, "workspace.created", w.id, { demo: true });
  return { workspace: w, users: identities };
}
export async function createDemoWorkspace() {
  return db.transaction((tx) => seedWorkspace(tx));
}
