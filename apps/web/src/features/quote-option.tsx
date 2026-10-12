"use client";
import { money, type QuoteDraft } from "@northstar/contracts";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useApi, useApp } from "../components/providers";
import { Button, Field } from "../components/ui";
import type { QuoteVersion } from "../lib/types";
export function QuoteOption({
  draft,
  update,
  version,
  oi,
  dirty,
}: {
  draft: QuoteDraft;
  update: (fn: (d: QuoteDraft) => void) => void;
  version: QuoteVersion;
  oi: number;
  dirty: boolean;
}) {
  const { t, locale } = useApp(),
    option = draft.options[oi],
    [templateId, setTemplateId] = useState("");
  const templates = useApi<{ items: any[] }>("/operator/content?kind=template");
  const templatesAvailable =
    templates.data?.items.filter(
      (x) => x.published?.currency === draft.currency,
    ) || [];
  const scopeLabels = {
    included: t.included,
    excluded: t.excluded,
    deliverables: t.deliverables,
    responsibilities: t.responsibilities,
    criteria: t.criteria,
  };
  return (
    <div className="option-editor" key={option.id}>
      <div className="between">
        <h3>
          0{oi + 1} / {t.chooseOption}
        </h3>
        {draft.options.length > 1 && (
          <Button
            variant="quiet"
            aria-label={`${t.remove}: ${option.name}`}
            onClick={() =>
              update((d) => {
                d.options.splice(oi, 1);
              })
            }
          >
            <X size={16} />
          </Button>
        )}
      </div>
      <div className="form-grid">
        <Field id={`option-${oi}`} label={t.optionName}>
          <input
            id={`option-${oi}`}
            value={option.name}
            onChange={(e) =>
              update((d) => {
                d.options[oi].name = e.target.value;
              })
            }
          />
        </Field>
        <Field id={`days-${oi}`} label={t.days}>
          <input
            id={`days-${oi}`}
            type="number"
            min="1"
            max="730"
            value={option.days}
            onChange={(e) =>
              update((d) => {
                d.options[oi].days = Number(e.target.value);
              })
            }
          />
        </Field>
        <Field id={`revisions-${oi}`} label={t.revisions}>
          <input
            id={`revisions-${oi}`}
            type="number"
            min="0"
            max="20"
            value={option.revisions}
            onChange={(e) =>
              update((d) => {
                d.options[oi].revisions = Number(e.target.value);
              })
            }
          />
        </Field>
      </div>
      <h4 className="section-label">{t.lines}</h4>
      {option.lines.map((line, li) => (
        <div className="editor-line" key={line.id}>
          <Field id={`line-${oi}-${li}`} label={t.line}>
            <input
              id={`line-${oi}-${li}`}
              value={line.label}
              onChange={(e) =>
                update((d) => {
                  d.options[oi].lines[li].label = e.target.value;
                })
              }
            />
          </Field>
          <Field id={`quantity-${oi}-${li}`} label={t.quantity}>
            <input
              id={`quantity-${oi}-${li}`}
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              value={line.quantity100 / 100}
              onChange={(e) =>
                update((d) => {
                  d.options[oi].lines[li].quantity100 = Math.round(
                    Number(e.target.value) * 100,
                  );
                })
              }
            />
          </Field>
          <Field id={`price-${oi}-${li}`} label={draft.currency}>
            <input
              id={`price-${oi}-${li}`}
              type="number"
              min="0"
              step="0.01"
              value={line.unitMinor / 100}
              onChange={(e) =>
                update((d) => {
                  d.options[oi].lines[li].unitMinor = Math.round(
                    Number(e.target.value) * 100,
                  );
                })
              }
            />
          </Field>
          <Button
            variant="quiet"
            disabled={option.lines.length <= 1}
            aria-label={`${t.remove}: ${line.label}`}
            onClick={() =>
              update((d) => {
                d.options[oi].lines.splice(li, 1);
              })
            }
          >
            <X size={16} />
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          update((d) => {
            d.options[oi].lines.push({
              id: crypto.randomUUID(),
              label: locale === "es" ? "Alcance adicional" : "Additional scope",
              quantity100: 100,
              unitMinor: 0,
            });
          })
        }
      >
        <Plus size={15} />
        {t.addLine}
      </Button>
      {oi === 0 && templatesAvailable.length > 0 && (
        <div className="actions" style={{ marginTop: 15 }}>
          <label className="sr-only" htmlFor="template-select">
            {t.template}
          </label>
          <select
            id="template-select"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">— {t.template} —</option>
            {templatesAvailable.map((x) => (
              <option key={x.id} value={x.id}>
                {x.published.name}
              </option>
            ))}
          </select>
          <Button
            variant="quiet"
            disabled={!templateId}
            onClick={() => {
              const template = templatesAvailable.find(
                (x) => x.id === templateId,
              )?.published;
              if (template)
                update((d) => {
                  d.options[oi].lines.push(
                    ...template.lines.map((line: any) => ({
                      ...line,
                      id: crypto.randomUUID(),
                    })),
                  );
                  for (const key of Object.keys(scopeLabels))
                    d.options[oi].scope[key as keyof typeof option.scope].push(
                      ...template.scope[key],
                    );
                });
            }}
          >
            {t.applyTemplate}
          </Button>
        </div>
      )}
      <div className="scope-editor">
        {Object.entries(scopeLabels).map(([key, label]) => (
          <Field
            id={`scope-${oi}-${key}`}
            label={label}
            hint={t.scopeHelp}
            key={key}
          >
            <textarea
              id={`scope-${oi}-${key}`}
              value={option.scope[key as keyof typeof option.scope].join("\n")}
              onChange={(e) =>
                update((d) => {
                  d.options[oi].scope[key as keyof typeof option.scope] =
                    e.target.value.split("\n").filter((x) => x.trim());
                })
              }
            />
          </Field>
        ))}
      </div>
      <div className="editor-summary">
        {t.total}:{" "}
        <strong>
          {money(
            version.snapshot.options[oi]?.totals.totalMinor || 0,
            draft.currency,
            locale,
          )}
        </strong>{" "}
        <small>{dirty ? `· ${t.saveDraft}` : ""}</small>
      </div>
    </div>
  );
}
