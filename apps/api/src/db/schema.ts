import type {
  BrandSettings,
  ContentKind,
  DemoIdentity,
  QuoteSnapshot,
  Service,
} from "@northstar/contracts";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
const dates = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const workspaces = pgTable("workspaces", {
  id: uuid().primaryKey().defaultRandom(),
  state: text().notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  brand: jsonb().$type<BrandSettings>().notNull(),
  ...dates(),
});
export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    identity: text().$type<DemoIdentity>().notNull(),
    name: text().notNull(),
    ...dates(),
  },
  (t) => [uniqueIndex("user_identity").on(t.workspaceId, t.identity)],
);
export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  csrf: text().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...dates(),
});
export const content = pgTable(
  "content",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text().$type<ContentKind>().notNull(),
    profile: text().notNull(),
    status: text().notNull().default("draft"),
    revision: integer().notNull().default(0),
    draft: jsonb().notNull(),
    published: jsonb(),
    history: jsonb().$type<unknown[]>().notNull().default([]),
    ...dates(),
  },
  (t) => [index("content_workspace").on(t.workspaceId, t.kind, t.status)],
);
export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    reference: text().notNull(),
    title: text().notNull(),
    status: text().notNull().default("new"),
    brief: jsonb().notNull(),
    service: jsonb().$type<Service>().notNull(),
    estimate: jsonb().notNull(),
    ...dates(),
  },
  (t) => [
    uniqueIndex("lead_reference").on(t.workspaceId, t.reference),
    index("lead_inbox").on(t.workspaceId, t.status, t.createdAt),
  ],
);
export const comments = pgTable("lead_comments", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  visibility: text().notNull(),
  body: text().notNull(),
  ...dates(),
});
export const quotes = pgTable("quotes", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .unique()
    .references(() => leads.id, { onDelete: "cascade" }),
  ...dates(),
});
export const versions = pgTable(
  "quote_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    number: integer().notNull(),
    status: text().notNull().default("draft"),
    snapshot: jsonb().$type<QuoteSnapshot>().notNull(),
    snapshotHash: text("snapshot_hash"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    pdf: jsonb().$type<{ path: string; hash: string; size?: number }>(),
    ...dates(),
  },
  (t) => [uniqueIndex("quote_revision").on(t.quoteId, t.number)],
);
export const acceptances = pgTable("quote_acceptances", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id")
    .notNull()
    .unique()
    .references(() => quotes.id),
  versionId: uuid("version_id")
    .notNull()
    .unique()
    .references(() => versions.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  optionId: text("option_id").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text().notNull(),
  snapshotHash: text("snapshot_hash").notNull(),
  ...dates(),
});
export const projects = pgTable("projects", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .unique()
    .references(() => leads.id),
  acceptanceId: uuid("acceptance_id")
    .notNull()
    .unique()
    .references(() => acceptances.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id),
  title: text().notNull(),
  option: jsonb().notNull(),
  ...dates(),
});
export const milestones = pgTable("project_milestones", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: jsonb().notNull(),
  position: integer().notNull(),
  status: text().notNull().default("planned"),
  ...dates(),
});
export const tasks = pgTable("tasks", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  milestoneId: uuid("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: jsonb().notNull(),
  owner: text().notNull(),
  status: text().notNull().default("todo"),
  ...dates(),
});
export const attachments = pgTable("attachments", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  leadId: uuid("lead_id").references(() => leads.id),
  filename: text().notNull(),
  mime: text().notNull(),
  size: integer().notNull(),
  path: text().notNull(),
  hash: text().notNull(),
  ...dates(),
});
export const events = pgTable(
  "audit_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    entityId: uuid("entity_id"),
    type: text().notNull(),
    visibility: text().notNull().default("public"),
    detail: jsonb().notNull().default({}),
    ...dates(),
  },
  (t) => [index("events_workspace").on(t.workspaceId, t.createdAt)],
);
export const notifications = pgTable("notifications", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  entityId: uuid("entity_id"),
  type: text().notNull(),
  channel: text().notNull().default("local"),
  readAt: timestamp("read_at", { withTimezone: true }),
  dedupe: text().unique(),
  ...dates(),
});
export const outbox = pgTable("outbox_events", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id"),
  type: text().notNull(),
  status: text().notNull().default("local-delivered"),
  dedupe: text().unique(),
  ...dates(),
});
export const idempotency = pgTable(
  "idempotency_records",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    scope: text().notNull(),
    key: text().notNull(),
    fingerprint: text().notNull(),
    result: jsonb().notNull(),
    ...dates(),
  },
  (t) => [
    uniqueIndex("idempotent_scope").on(t.workspaceId, t.userId, t.scope, t.key),
  ],
);
export const drafts = pgTable("brief_drafts", {
  id: uuid().primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  data: jsonb().notNull(),
  ...dates(),
});
