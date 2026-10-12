"use client";
import { money } from "@northstar/contracts";
import { Button } from "../components/ui";
import type { BriefFlow } from "./use-brief-flow";
export function BriefEstimate({ flow }: { flow: BriefFlow }) {
  const { t, locale, estimate, pkg, service, questions, values } = flow;
  const missing = questions.filter(
    (q) => q.required && !values.answers[q.id]?.trim(),
  );
  return (
    <aside className="brief-aside">
      <p className="eyebrow">{t.estimate}</p>
      <h3>{service?.data.name[locale]}</h3>
      {estimate.isError ? (
        <>
          <p>{t.estimateFailed}</p>
          <Button onClick={() => estimate.refetch()}>{t.retry}</Button>
        </>
      ) : estimate.isFetching ? (
        <p role="status">{t.estimateLoading}</p>
      ) : (
        estimate.data && (
          <>
            {estimate.data.lines.map((l: any) => (
              <div className="estimate-line" key={l.id}>
                <span>
                  {service?.data.packages.find((p) => p.id === l.id)?.name[
                    locale
                  ] ||
                    service?.data.addons.find((a) => a.id === l.id)?.name[
                      locale
                    ] ||
                    l.label}{" "}
                  × {l.quantity100 / 100}
                </span>
                <span>
                  {money(
                    Math.round((l.unitMinor * l.quantity100) / 100),
                    estimate.data.currency,
                    locale,
                  )}
                </span>
              </div>
            ))}
            <div className="estimate-total">
              <span>{t.total}</span>
              <span>
                {money(
                  estimate.data.totals.totalMinor,
                  estimate.data.currency,
                  locale,
                )}
              </span>
            </div>
            <small>
              {estimate.data.range.minDays}–{estimate.data.range.maxDays}{" "}
              {t.days}
              <br />
              {t.estimate}
            </small>
          </>
        )
      )}
      <h4 className="section-label">{t.included}</h4>
      <ul>
        {pkg?.included.map((c, i) => (
          <li key={i}>
            <small>{c[locale]}</small>
          </li>
        ))}
      </ul>
      <h4 className="section-label">{t.excluded}</h4>
      <ul>
        {pkg?.excluded.map((c, i) => (
          <li key={i}>
            <small>{c[locale]}</small>
          </li>
        ))}
      </ul>
      <div aria-live="polite">
        <h4 className="section-label">{t.briefHints}</h4>
        <ul>
          {missing.map((q) => (
            <li key={q.id}>
              <small>{q.hint[locale]}</small>
            </li>
          ))}
          {!values.deadline && (
            <li>
              <small>{t.deadlineHint}</small>
            </li>
          )}
        </ul>
        {missing.length === 0 && values.deadline && (
          <small>{t.briefComplete}</small>
        )}
      </div>
    </aside>
  );
}
