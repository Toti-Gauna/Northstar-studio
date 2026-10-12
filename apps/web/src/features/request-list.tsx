"use client";
import { SiteLink } from "../components/site-link";
import { ArrowUpRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi, useApp } from "../components/providers";
import {
  Button,
  Empty,
  LinkButton,
  PageHeading,
  QueryState,
  Status,
} from "../components/ui";
import { dateTime } from "../lib/format";
import type { Lead, List } from "../lib/types";

export function RequestList({ operator }: { operator: boolean }) {
  const { t, locale, me } = useApp(),
    params = useSearchParams(),
    router = useRouter();
  const search = params.get("search") || "",
    status = params.get("status") || "",
    source = params.get("source") || "",
    page = Number(params.get("page")) || 1;
  const query = useApi<List<Lead>>(
    `${operator ? "/operator/leads" : "/me/requests"}?${new URLSearchParams({ search, status, source, page: String(page) })}`,
  );
  const base = operator ? "/operator/" : "/client/";
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set("view", operator ? "inbox" : "requests");
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`${base}?${next}`, { scroll: false });
  };
  return (
    <>
      <PageHeading
        eyebrow={`${me!.brand.name} / ${t.isolated}`}
        title={operator ? t.inbox : t.requests}
        body={operator ? t.processBody : t.currentProposalBody}
      >
        <LinkButton href="/brief/">{t.newBrief}</LinkButton>
      </PageHeading>
      <div className="toolbar">
        <label className="sr-only" htmlFor="request-search">
          {t.search}
        </label>
        <input
          id="request-search"
          placeholder={t.search}
          value={search}
          onChange={(e) => setFilter("search", e.target.value)}
        />
        <label className="sr-only" htmlFor="stage-filter">
          {t.status}
        </label>
        <select
          id="stage-filter"
          value={status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">{t.allStatuses}</option>
          {["new", "qualified", "quoted", "won", "lost"].map((s) => (
            <option value={s} key={s}>
              {(t as any)[s]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="source-filter">
          {t.source}
        </label>
        <select
          id="source-filter"
          value={source}
          onChange={(e) => setFilter("source", e.target.value)}
        >
          <option value="">{t.allSources}</option>
          {[
            ["website", t.website],
            ["lead", t.lead],
            ["cold-email", t.coldEmail],
            ["referral", t.referral],
            ["in-person", t.inPerson],
          ].map(([s, label]) => (
            <option key={s} value={s}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <QueryState query={query}>
        {query.data?.items.length ? (
          <div
            className="table-scroll"
            role="region"
            aria-label={t.requests}
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>{t.request}</th>
                  <th>{t.status}</th>
                  <th>{t.source}</th>
                  <th>{t.time}</th>
                  <th>
                    <span className="sr-only">{t.showDetails}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((lead) => (
                  <tr key={lead.id}>
                    <td className="request-cell">
                      <SiteLink href={`${base}?view=request&id=${lead.id}`}>
                        <strong>{lead.title}</strong>
                        <small>
                          {lead.reference} / {lead.service.data.name[locale]}
                        </small>
                      </SiteLink>
                    </td>
                    <td>
                      <Status value={lead.status} />
                    </td>
                    <td>
                      {
                        (
                          {
                            website: t.website,
                            lead: t.lead,
                            "cold-email": t.coldEmail,
                            referral: t.referral,
                            "in-person": t.inPerson,
                          } as any
                        )[lead.brief.source]
                      }
                    </td>
                    <td>
                      <small>
                        {dateTime(lead.createdAt, locale, me!.brand.timezone)}
                      </small>
                    </td>
                    <td>
                      <SiteLink
                        className="table-link"
                        href={`${base}?view=request&id=${lead.id}`}
                        aria-label={`${t.showDetails}: ${lead.reference}`}
                      >
                        <ArrowUpRight size={18} />
                      </SiteLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text={t.noResults}>
            <Button variant="secondary" onClick={() => router.replace(base)}>
              {t.clearFilters}
            </Button>
          </Empty>
        )}
        <div className="pagination">
          <span>
            {query.data?.total || 0} {t.rows} · {t.page} {page} {t.of}{" "}
            {Math.max(1, Math.ceil((query.data?.total || 0) / 10))}
          </span>
          <div className="actions">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setFilter("page", String(page - 1))}
            >
              {t.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page * 10 >= (query.data?.total || 0)}
              onClick={() => setFilter("page", String(page + 1))}
            >
              {t.next}
            </Button>
          </div>
        </div>
      </QueryState>
    </>
  );
}
