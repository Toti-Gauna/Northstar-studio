"use client";
import { money, type ContentKind } from "@northstar/contracts";
import { useApp } from "../components/providers";
import { Field } from "../components/ui";
export function ContentQuickEdit({
  kind,
  json,
  setJson,
}: {
  kind: ContentKind;
  json: string;
  setJson: (s: string) => void;
}) {
  const { t } = useApp();
  let data: any;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  const labels: Record<string, string> = {
    name: t.contentName,
    title: t.contentName,
    summary: t.summary,
    description: t.description,
    question: t.question,
    answer: t.answer,
    challenge: t.challenge,
    approach: t.approach,
  };
  const keys =
    kind === "service"
      ? ["name", "summary", "description"]
      : kind === "case"
        ? ["title", "summary", "challenge", "approach"]
        : kind === "faq"
          ? ["question", "answer"]
          : [];
  const update = (key: string, locale: string, value: string) => {
    const next = structuredClone(data);
    next[key][locale] = value;
    setJson(JSON.stringify(next, null, 2));
  };
  return (
    <div className="form-stack">
      <div className="form-grid">
        {keys.map((key) =>
          ["en", "es"].map((locale) => (
            <Field
              key={`${key}-${locale}`}
              id={`quick-${key}-${locale}`}
              label={`${labels[key]} / ${locale.toUpperCase()}`}
            >
              {["name", "title", "question"].includes(key) ? (
                <input
                  id={`quick-${key}-${locale}`}
                  value={data[key]?.[locale] || ""}
                  onChange={(e) => update(key, locale, e.target.value)}
                />
              ) : (
                <textarea
                  id={`quick-${key}-${locale}`}
                  value={data[key]?.[locale] || ""}
                  onChange={(e) => update(key, locale, e.target.value)}
                />
              )}
            </Field>
          )),
        )}
      </div>
      {kind === "service" &&
        data.packages?.map((p: any, i: number) => (
          <div key={p.id}>
            <h4>
              {t.package}: {p.name.en}
            </h4>
            <div className="form-grid">
              {["USD", "ARS"].map((currency) => (
                <Field
                  key={currency}
                  id={`cms-price-${i}-${currency}`}
                  label={currency}
                >
                  <input
                    id={`cms-price-${i}-${currency}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={p.prices[currency] / 100}
                    onChange={(e) => {
                      const next = structuredClone(data);
                      next.packages[i].prices[currency] = Math.round(
                        Number(e.target.value) * 100,
                      );
                      setJson(JSON.stringify(next, null, 2));
                    }}
                  />
                </Field>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
export function PreviewContent({
  kind,
  data,
}: {
  kind: ContentKind;
  data: any;
}) {
  const { locale, t, me } = useApp();
  return (
    <div className="preview-content">
      {kind === "service" ? (
        <>
          <h3>{data.name[locale]}</h3>
          <p>{data.description[locale]}</p>
          {data.packages.map((p: any) => (
            <div key={p.id}>
              <h4>
                {p.name[locale]} ·{" "}
                {money(
                  p.prices[me!.brand.currency],
                  me!.brand.currency,
                  locale,
                )}
              </h4>
              <ul>
                {p.included.map((x: any, i: number) => (
                  <li key={i}>{x[locale]}</li>
                ))}
              </ul>
            </div>
          ))}
          <h4>{t.brief}</h4>
          {data.questions.map((q: any) => (
            <p key={q.id}>{q.label[locale]}</p>
          ))}
        </>
      ) : kind === "case" ? (
        <>
          <span className="eyebrow">{t.caseLabel}</span>
          <h3>{data.title[locale]}</h3>
          <p>{data.summary[locale]}</p>
          <h4>{t.challenge}</h4>
          <p>{data.challenge[locale]}</p>
          <h4>{t.approach}</h4>
          <p>{data.approach[locale]}</p>
        </>
      ) : kind === "faq" ? (
        <>
          <h3>{data.question[locale]}</h3>
          <p>{data.answer[locale]}</p>
        </>
      ) : (
        <>
          <h3>{data.name}</h3>
          {data.lines.map((l: any) => (
            <p key={l.id}>
              {l.label} / {money(l.unitMinor, data.currency, locale)}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
