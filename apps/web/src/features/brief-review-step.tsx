"use client";
import type { BriefFlow } from "./use-brief-flow";
export function BriefReviewStep({ flow }: { flow: BriefFlow }) {
  const { t, locale, values, pkg, questions, service } = flow;
  return (
    <>
      <h3>{values.title}</h3>
      <dl className="brief-detail">
        <div>
          <dt>{t.services}</dt>
          <dd>{service?.data.name[locale]}</dd>
        </div>
        <div>
          <dt>{t.package}</dt>
          <dd>{pkg?.name[locale]}</dd>
        </div>
        <div>
          <dt>{t.name}</dt>
          <dd>{values.name}</dd>
        </div>
        <div>
          <dt>{t.email}</dt>
          <dd>{values.email}</dd>
        </div>
        {questions.map((q) => (
          <div className="full" key={q.id}>
            <dt>{q.label[locale]}</dt>
            <dd>{values.answers[q.id]}</dd>
          </div>
        ))}
        <div>
          <dt>{t.documents}</dt>
          <dd>{values.attachmentIds.length}</dd>
        </div>
        <div>
          <dt>{t.deadline}</dt>
          <dd>{values.deadline || "—"}</dd>
        </div>
      </dl>
      <p className="history-warning">{t.submissionNote}</p>
    </>
  );
}
