"use client";
import { money } from "@northstar/contracts";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { useApi, useApp } from "../components/providers";
import { Field, Modal, QueryState } from "../components/ui";
import type { QuoteVersion } from "../lib/types";
import { Scope } from "./proposal-scope";
export function VersionCompare({
  quoteId,
  versions,
  onClose,
}: {
  quoteId: string;
  versions: QuoteVersion[];
  onClose: () => void;
}) {
  const { t, locale } = useApp(),
    [from, setFrom] = useState(versions[1].id),
    [to, setTo] = useState(versions[0].id),
    query = useApi<any>(`/quotes/${quoteId}/compare?from=${from}&to=${to}`);
  return (
    <Modal title={t.compare} onClose={onClose}>
      <div className="diff-grid">
        <Field id="compare-from" label={t.from}>
          <select
            id="compare-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            {versions.map((v) => (
              <option value={v.id} key={v.id}>
                V{v.number} / {(t as any)[v.status]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="compare-to" label={t.to}>
          <select
            id="compare-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          >
            {versions.map((v) => (
              <option value={v.id} key={v.id}>
                V{v.number} / {(t as any)[v.status]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <QueryState query={query}>
        {query.data?.options.map((o: any) => (
          <div key={o.id}>
            <div className="diff-summary">
              <span>
                {o.after?.name || o.before?.name} / {t.delta}
              </span>
              <strong>
                {o.deltaMinor > 0 ? "+" : o.deltaMinor < 0 ? "−" : ""}
                {money(
                  Math.abs(o.deltaMinor),
                  query.data.to.snapshot.currency,
                  locale,
                )}
              </strong>
              <small>
                {t.timeChanged}: {o.daysDelta > 0 ? "+" : ""}
                {o.daysDelta} {t.dayDelta}
              </small>
            </div>
            <div
              className="table-scroll"
              role="region"
              aria-label={t.changes}
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>{t.scope}</th>
                    <th>V{query.data.from.number}</th>
                    <th>V{query.data.to.number}</th>
                    <th>{t.changes}</th>
                  </tr>
                </thead>
                <tbody>
                  {o.lines.map((l: any) => (
                    <tr
                      key={l.id}
                      className={`diff-row ${l.changed ? "changed" : ""}`}
                    >
                      <td>{l.after?.label || l.before?.label}</td>
                      <td>
                        {l.before
                          ? `${l.before.quantity100 / 100} × ${money(l.before.unitMinor, query.data.from.snapshot.currency, locale)}`
                          : "—"}
                      </td>
                      <td>
                        {l.after
                          ? `${l.after.quantity100 / 100} × ${money(l.after.unitMinor, query.data.to.snapshot.currency, locale)}`
                          : "—"}
                      </td>
                      <td>
                        <span className="diff-change">
                          {l.changed ? (
                            <ArrowRight size={13} />
                          ) : (
                            <Check size={13} />
                          )}{" "}
                          {l.changed ? t.changed : t.unchanged}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {o.scopeChanged && (
              <div className="diff-summary">
                <p>
                  <ArrowRight size={15} /> {t.scopeChanged}
                </p>
                <div className="diff-grid">
                  <div>
                    <h4>V{query.data.from.number}</h4>
                    {o.before && <Scope scope={o.before.scope} />}
                  </div>
                  <div>
                    <h4>V{query.data.to.number}</h4>
                    {o.after && <Scope scope={o.after.scope} />}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </QueryState>
    </Modal>
  );
}
