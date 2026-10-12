"use client";
import { type QuoteSnapshot } from "@northstar/contracts";
import { useApp } from "../components/providers";

export function Scope({
  scope,
}: {
  scope: QuoteSnapshot["options"][number]["scope"];
}) {
  const { t } = useApp();
  const labels = {
    included: t.included,
    excluded: t.excluded,
    deliverables: t.deliverables,
    responsibilities: t.responsibilities,
    criteria: t.criteria,
  };
  return (
    <div className="quote-scope">
      {Object.entries(labels).map(([key, label]) => (
        <div className="scope-block" key={key}>
          <h4>{label}</h4>
          <ul>
            {scope[key as keyof typeof scope].length ? (
              scope[key as keyof typeof scope].map((x, i) => (
                <li key={i}>{x}</li>
              ))
            ) : (
              <li>—</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
