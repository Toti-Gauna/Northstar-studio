import type {
  BrandSettings,
  BriefInput,
  Copy,
  DemoIdentity,
  QuoteSnapshot,
  Service,
} from "@northstar/contracts";
export type Me = {
  workspaceId: string;
  userId: string;
  identity: DemoIdentity;
  role: "customer" | "operator";
  name: string;
  csrfToken: string;
  brand: BrandSettings;
  expiresAt: string;
  allowedIdentities: DemoIdentity[];
};
export type Lead = {
  id: string;
  reference: string;
  title: string;
  status: string;
  brief: BriefInput;
  service: Service;
  estimate: any;
  createdAt: string;
  quoteId?: string | null;
  comments?: {
    id: string;
    body: string;
    visibility: string;
    createdAt: string;
    author: string;
  }[];
  attachments?: { id: string; filename: string; size: number; mime: string }[];
};
export type QuoteVersion = {
  id: string;
  quoteId: string;
  number: number;
  status: string;
  snapshot: QuoteSnapshot;
  snapshotHash: string | null;
  sentAt: string | null;
  expiresAt: string | null;
};
export type Project = {
  id: string;
  leadId: string;
  title: string;
  reference: string;
  option: any;
  quoteId: string;
  acceptance: {
    versionId: string;
    optionId: string;
    snapshotHash: string;
    amountMinor: number;
    currency: "USD" | "ARS";
    createdAt: string;
  };
  milestones: {
    id: string;
    title: Copy;
    status: string;
    tasks: { id: string; title: Copy; owner: string; status: string }[];
  }[];
};
export type List<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
