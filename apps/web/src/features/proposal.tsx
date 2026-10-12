"use client";
import { money } from "@northstar/contracts";
import {
  ArrowRight,
  ArrowUpRight,
  Copy,
  FileText,
  GitCompare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAction, useApi, useApp } from "../components/providers";
import { Button, Confirm, Empty, Status } from "../components/ui";
import { download, request } from "../lib/api";
import { dateTime } from "../lib/format";
import type { Lead, List, Project, QuoteVersion } from "../lib/types";
import { Scope } from "./proposal-scope";
import { VersionCompare } from "./version-compare";
export { Scope } from "./proposal-scope";

export function ProposalRoom({
  lead,
  operator,
}: {
  lead: Lead;
  operator: boolean;
}) {
  const { t, me, locale, toast } = useApp(),
    router = useRouter(),
    query = useApi<{ items: QuoteVersion[] }>(
      `/quotes/${lead.quoteId}/versions`,
      !!lead.quoteId,
    ),
    project = useApi<List<Project>>(
      `/projects?leadId=${lead.id}`,
      lead.status === "won",
    ),
    [versionId, setVersionId] = useState(""),
    [optionId, setOptionId] = useState(""),
    [checks, setChecks] = useState<string[]>([]),
    [confirming, setConfirming] = useState<"accept" | "decline" | null>(null),
    [comparing, setComparing] = useState(false),
    action = useAction();
  const sent = query.data?.items.filter((v) => v.status !== "draft") || [],
    version = sent.find((v) => v.id === versionId) || sent[0],
    option =
      version?.snapshot.options.find((o) => o.id === optionId) ||
      version?.snapshot.options[0];
  const canAccept =
    version?.status === "sent" && lead.status === "quoted" && !operator;
  useEffect(() => {
    setChecks([]);
    setOptionId("");
  }, [version?.id]);
  if (!lead.quoteId || !sent.length)
    return (
      <section className="panel">
        <h2>{t.currentProposal}</h2>
        <Empty text={t.noProposal} />
      </section>
    );
  return (
    <section className="panel proposal-room">
      <div className="proposal-cover">
        <p className="eyebrow">
          {version.snapshot.brand.name} / {lead.reference} / V{version.number}
        </p>
        <h2>{t.currentProposal}</h2>
        <p>{t.currentProposalBody}</p>
        <div className="between">
          <Status value={version.status} />
          <small>
            {version.sentAt &&
              dateTime(version.sentAt, locale, me!.brand.timezone)}
            {version.expiresAt &&
              ` → ${dateTime(version.expiresAt, locale, me!.brand.timezone)}`}
          </small>
        </div>
      </div>
      <div className="between" style={{ marginBottom: 18 }}>
        <h4>{t.versions}</h4>
        {sent.length > 1 && (
          <Button variant="secondary" onClick={() => setComparing(true)}>
            <GitCompare size={15} />
            {t.compare}
          </Button>
        )}
      </div>
      <div className="version-tabs">
        {sent.map((v) => (
          <button
            key={v.id}
            className={v.id === version.id ? "active" : ""}
            onClick={() => setVersionId(v.id)}
          >
            V{v.number} · {(t as any)[v.status]}
          </button>
        ))}
      </div>
      <p>
        <small>{t.revisionNotice}</small>
      </p>
      <div className="option-tabs" role="group" aria-label={t.chooseOption}>
        {version.snapshot.options.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              if (option?.id !== o.id) {
                setOptionId(o.id);
                setChecks([]);
              }
            }}
            aria-pressed={option?.id === o.id}
          >
            <span>{o.name}</span>
            <strong>
              {money(o.totals.totalMinor, version.snapshot.currency, locale)}
            </strong>
            <small>
              {o.days} {t.days} / {o.revisions} {t.revisions}
            </small>
          </button>
        ))}
      </div>
      {option && (
        <>
          <h4 className="section-label">{t.lines}</h4>
          <div
            className="table-scroll"
            role="region"
            aria-label={t.lines}
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>{t.scope}</th>
                  <th>{t.quantity}</th>
                  <th>{version.snapshot.currency}</th>
                  <th>{t.total}</th>
                </tr>
              </thead>
              <tbody>
                {option.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.label}</td>
                    <td>{line.quantity100 / 100}</td>
                    <td>
                      {money(line.unitMinor, version.snapshot.currency, locale)}
                    </td>
                    <td>
                      {money(
                        Math.floor(
                          (line.unitMinor * line.quantity100 + 50) / 100,
                        ),
                        version.snapshot.currency,
                        locale,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals-grid">
            <p className="quote-terms">
              <strong>{t.terms}</strong>
              <br />
              {version.snapshot.terms}
            </p>
            <div>
              {[
                ["subtotalMinor", t.subtotal],
                ["discountMinor", t.discount],
                ["taxMinor", t.tax],
              ].map(([key, label]) => (
                <div className="estimate-line" key={key}>
                  <span>{label}</span>
                  <span>
                    {money(
                      option.totals[key as keyof typeof option.totals],
                      version.snapshot.currency,
                      locale,
                    )}
                  </span>
                </div>
              ))}
              <div className="estimate-total">
                <span>{t.total}</span>
                <span>
                  {money(
                    option.totals.totalMinor,
                    version.snapshot.currency,
                    locale,
                  )}
                </span>
              </div>
            </div>
          </div>
          <Scope scope={option.scope} />
          {canAccept && (
            <div className="reading-checks">
              <h4>{t.scope}</h4>
              {[
                ["scope", t.checkScope],
                ["exclusions", t.checkExclusions],
                ["responsibilities", t.checkResponsibilities],
                ["terms", t.checkTerms],
              ].map(([id, label]) => (
                <label className="check" key={id}>
                  <input
                    type="checkbox"
                    checked={checks.includes(id)}
                    onChange={(e) =>
                      setChecks((c) =>
                        e.target.checked
                          ? [...c, id]
                          : c.filter((x) => x !== id),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
          <div className="actions acceptance-actions">
            <Button
              variant="secondary"
              busy={action.pending}
              onClick={() =>
                action.run(
                  () =>
                    download(
                      `/quotes/${lead.quoteId}/pdf?version=${version.id}`,
                      `${lead.reference}-v${version.number}.pdf`,
                    ),
                  t.downloaded,
                )
              }
            >
              <FileText size={15} />
              {t.pdf}
            </Button>
            {canAccept && (
              <>
                <Button
                  disabled={checks.length !== 4}
                  onClick={() => setConfirming("accept")}
                >
                  {t.accept}
                  <ArrowRight size={16} />
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => setConfirming("decline")}
                >
                  {t.decline}
                </Button>
              </>
            )}
            {lead.status === "won" && project.data?.items[0] && (
              <a
                className="button primary"
                href={`${operator ? "/operator/" : "/client/"}?view=project&id=${project.data.items[0].id}`}
              >
                {t.openProject}
                <ArrowUpRight size={16} />
              </a>
            )}
            <Button
              variant="quiet"
              onClick={() =>
                action.run(async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/client/?view=request&id=${lead.id}`,
                  );
                }, t.copied)
              }
            >
              <Copy size={14} />
              {t.share}
            </Button>
          </div>
          {checks.length !== 4 && canAccept && <small>{t.confirmRead}</small>}
        </>
      )}
      {confirming && (
        <Confirm
          title={confirming === "accept" ? t.acceptTitle : t.declineTitle}
          body={confirming === "accept" ? t.acceptBody : t.declineBody}
          busy={action.pending}
          onClose={() => setConfirming(null)}
          onConfirm={async () => {
            if (confirming === "accept") {
              const result = await action.run(() =>
                request<any>(`/quotes/${lead.quoteId}/accept`, "POST", {
                  versionId: version.id,
                  optionId: option.id,
                  checks,
                }),
              );
              if (result) {
                toast(t.projectCreated);
                router.push(`/client/?view=project&id=${result.project.id}`);
              }
            } else {
              const result = await action.run(
                () =>
                  request(`/quotes/${lead.quoteId}/decline`, "POST", {
                    versionId: version.id,
                  }),
                t.declined,
              );
              if (result) setConfirming(null);
            }
          }}
        />
      )}
      {comparing && (
        <VersionCompare
          quoteId={lead.quoteId}
          versions={sent}
          onClose={() => setComparing(false)}
        />
      )}
    </section>
  );
}
