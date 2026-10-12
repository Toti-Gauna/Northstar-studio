"use client";
import { ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import { useAction, useApi, useApp } from "../components/providers";
import { Button, Empty, PageHeading, QueryState } from "../components/ui";
import { download, request } from "../lib/api";
import { dateTime } from "../lib/format";
import { eventLabel } from "./activity";
export function WorkspaceFeed({
  kind,
  operator,
}: {
  kind: "notifications" | "outbox" | "activity";
  operator: boolean;
}) {
  const { t, me, locale } = useApp(),
    query = useApi<{ items: any[] }>(
      kind === "notifications"
        ? "/inbox"
        : kind === "outbox"
          ? "/outbox"
          : "/activity",
    ),
    action = useAction(),
    [page, setPage] = useState(1);
  const title =
    kind === "notifications"
      ? t.notifications
      : kind === "outbox"
        ? t.outbox
        : t.activity;
  return (
    <>
      <PageHeading
        eyebrow={`${me!.brand.name} / ${t.localData}`}
        title={title}
        body={t.noExternal}
      />
      <QueryState query={query}>
        {query.data?.items.length ? (
          query.data.items.slice((page - 1) * 10, page * 10).map((e) => (
            <article className="notification-row" key={e.id}>
              <div>
                <strong>{eventLabel(e.type, t)}</strong>
                <small>
                  {dateTime(e.createdAt, locale, me!.brand.timezone)} /{" "}
                  {kind === "notifications"
                    ? e.readAt
                      ? t.read
                      : t.unread
                    : t.localNotice}
                </small>
                {e.entityId && <small>{e.entityId.slice(0, 8)}</small>}
              </div>
              <div className="actions">
                {kind === "notifications" && e.entityId && (
                  <a
                    className="button quiet"
                    href={`${operator ? "/operator/" : "/client/"}?view=request&id=${e.entityId}`}
                    aria-label={t.openRequest}
                  >
                    <ArrowUpRight size={16} />
                  </a>
                )}
                {kind === "notifications" && !e.readAt && (
                  <Button
                    variant="secondary"
                    busy={action.pending}
                    onClick={() =>
                      action.run(
                        () => request(`/inbox/${e.id}/read`, "POST", {}),
                        t.read,
                      )
                    }
                  >
                    <Check size={14} />
                    {t.markRead}
                  </Button>
                )}
              </div>
            </article>
          ))
        ) : (
          <Empty text={t.noActivity} />
        )}
        <div className="pagination">
          <span>
            {t.page} {page} /{" "}
            {Math.max(1, Math.ceil((query.data?.items.length || 0) / 10))}
          </span>
          <div className="actions">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {t.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page * 10 >= (query.data?.items.length || 0)}
              onClick={() => setPage(page + 1)}
            >
              {t.next}
            </Button>
          </div>
        </div>
      </QueryState>
    </>
  );
}
export function Analytics() {
  const { t, me } = useApp(),
    query = useApi<any>("/analytics"),
    action = useAction();
  const counts = query.data?.counts || [];
  const metrics = [
    ["lead.created", t.requests],
    ["quote.sent", t.sent],
    ["quote.accepted", t.accepted],
  ];
  return (
    <>
      <PageHeading
        eyebrow={`${me!.brand.name} / ${t.localData}`}
        title={t.analytics}
        body={t.analyticsBody}
      >
        <Button
          variant="secondary"
          busy={action.pending}
          onClick={() =>
            action.run(
              () => download("/sales-card", "northstar-demo-card.txt"),
              t.downloaded,
            )
          }
        >
          {t.salesCard}
        </Button>
      </PageHeading>
      <QueryState query={query}>
        <div className="metric-list">
          {metrics.map(([key, label]) => (
            <article key={key}>
              <small>{label}</small>
              <strong>
                {counts.find((x: any) => x.type === key)?.count || 0}
              </strong>
            </article>
          ))}
        </div>
        <section className="panel">
          <h2>{t.source}</h2>
          {query.data?.sources.map((s: any) => (
            <div className="estimate-line" key={s.source}>
              <span>
                {(
                  {
                    website: t.website,
                    lead: t.lead,
                    "cold-email": t.coldEmail,
                    referral: t.referral,
                    "in-person": t.inPerson,
                  } as any
                )[s.source] || s.source}
              </span>
              <strong>{s.count}</strong>
            </div>
          ))}
          <p className="history-warning">{t.analyticsBody}</p>
        </section>
      </QueryState>
    </>
  );
}
