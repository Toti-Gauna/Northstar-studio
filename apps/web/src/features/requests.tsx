"use client";
import { SiteLink } from "../components/site-link";
import { activeQuestions } from "@northstar/contracts";
import { FileText } from "lucide-react";
import { useState } from "react";
import { useAction, useApi, useApp } from "../components/providers";
import {
  Button,
  Confirm,
  PageHeading,
  QueryState,
  Status,
} from "../components/ui";
import { download, request } from "../lib/api";
import type { Lead, QuoteVersion } from "../lib/types";
import { ActivityRail } from "./activity";
import { Comments } from "./comments";
import { ProposalRoom } from "./proposal";
import { QuoteEditor } from "./quote-editor";

export function RequestDetail({
  id,
  operator,
}: {
  id: string;
  operator: boolean;
}) {
  const { t, locale, me } = useApp(),
    query = useApi<Lead>(`/leads/${id}`, !!id),
    action = useAction(),
    [closing, setClosing] = useState(false);
  const lead = query.data,
    versions = useApi<{ items: QuoteVersion[] }>(
      `/quotes/${lead?.quoteId}/versions`,
      !!lead?.quoteId,
    );
  const draft = versions.data?.items.find((v) => v.status === "draft");
  return (
    <QueryState query={query}>
      {lead && (
        <>
          <SiteLink
            className="text-link"
            href={operator ? "/operator/" : "/client/"}
          >
            ← {operator ? t.inbox : t.requests}
          </SiteLink>
          <PageHeading eyebrow={lead.reference} title={lead.title}>
            <Status value={lead.status} />
          </PageHeading>
          <p className="request-reference">
            {t.leadId}: {lead.id}
          </p>
          {lead.service.data.profile !== me?.brand.profile && (
            <p>{t.serviceChange}</p>
          )}
          <div className="detail-layout">
            <div className="detail-main">
              <div className="panel">
                <div className="between">
                  <h2>{t.detail}</h2>
                  <span className="eyebrow">
                    {lead.service.data.name[locale]}
                  </span>
                </div>
                <dl className="brief-detail">
                  <div>
                    <dt>{t.name}</dt>
                    <dd>{lead.brief.name}</dd>
                  </div>
                  <div>
                    <dt>{t.email}</dt>
                    <dd>{lead.brief.email}</dd>
                  </div>
                  <div>
                    <dt>{t.package}</dt>
                    <dd>
                      {
                        lead.service.data.packages.find(
                          (p) => p.id === lead.brief.packageId,
                        )?.name[locale]
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>{t.deadline}</dt>
                    <dd>{lead.brief.deadline || "—"}</dd>
                  </div>
                  <div>
                    <dt>{t.source}</dt>
                    <dd>
                      {lead.brief.source} / {lead.brief.channel} /{" "}
                      {lead.brief.campaign || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.quantity}</dt>
                    <dd>
                      {lead.brief.quantity100 / 100}{" "}
                      {lead.service.data.unit[locale]}
                    </dd>
                  </div>
                  {activeQuestions(lead.service.data, lead.brief.answers).map(
                    (q) => (
                      <div key={q.id} className="full">
                        <dt>{q.label[locale]}</dt>
                        <dd>
                          {q.type === "select"
                            ? q.options?.find(
                                (o) => o.en === lead.brief.answers[q.id],
                              )?.[locale]
                            : lead.brief.answers[q.id]}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
                <h4 className="section-label">{t.documents}</h4>
                <div className="attachments">
                  {lead.attachments?.length ? (
                    lead.attachments.map((file) => (
                      <Button
                        key={file.id}
                        variant="secondary"
                        busy={action.pending}
                        onClick={() =>
                          action.run(() =>
                            download(
                              `/attachments/${file.id}/download`,
                              file.filename,
                            ),
                          )
                        }
                      >
                        <FileText size={14} />
                        {file.filename}
                      </Button>
                    ))
                  ) : (
                    <small>—</small>
                  )}
                </div>
                {operator && (
                  <div className="actions" style={{ marginTop: 24 }}>
                    {lead.status === "new" && (
                      <Button
                        busy={action.pending}
                        onClick={() =>
                          action.run(
                            () =>
                              request(`/leads/${id}/transitions`, "POST", {
                                to: "qualified",
                              }),
                            t.qualified,
                          )
                        }
                      >
                        {t.qualify}
                      </Button>
                    )}
                    {["qualified", "quoted"].includes(lead.status) &&
                      !draft && (
                        <Button
                          busy={action.pending}
                          onClick={() =>
                            action.run(
                              () => request(`/leads/${id}/quotes`, "POST", {}),
                              t.saved,
                            )
                          }
                        >
                          {lead.quoteId ? t.newRevision : t.createQuote}
                        </Button>
                      )}
                    {["new", "qualified", "quoted"].includes(lead.status) && (
                      <Button variant="quiet" onClick={() => setClosing(true)}>
                        {t.closeRequest}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {draft &&
                operator &&
                ["qualified", "quoted"].includes(lead.status) && (
                  <QuoteEditor lead={lead} version={draft} />
                )}
              <ProposalRoom lead={lead} operator={operator} />
              <Comments lead={lead} operator={operator} />
            </div>
            <ActivityRail entity={id} />
          </div>
          {closing && (
            <Confirm
              title={t.closeRequest}
              body={t.declineBody}
              busy={action.pending}
              onClose={() => setClosing(false)}
              onConfirm={async () => {
                await action.run(
                  () =>
                    request(`/leads/${id}/transitions`, "POST", { to: "lost" }),
                  t.lost,
                );
                setClosing(false);
              }}
            />
          )}
        </>
      )}
    </QueryState>
  );
}
