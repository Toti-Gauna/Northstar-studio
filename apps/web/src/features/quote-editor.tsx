"use client";
import { type QuoteDraft } from "@northstar/contracts";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAction, useApp } from "../components/providers";
import { Button, Confirm, Field } from "../components/ui";
import { request } from "../lib/api";
import type { Lead, QuoteVersion } from "../lib/types";
import { QuoteOption } from "./quote-option";
function editable(v: QuoteVersion): QuoteDraft {
  const s = v.snapshot;
  return {
    currency: s.currency,
    discountBps: s.discountBps,
    taxBps: s.taxBps,
    validDays: s.validDays,
    terms: s.terms,
    options: s.options.map(({ totals: _totals, ...o }) => o),
  };
}
export function QuoteEditor({
  lead,
  version,
}: {
  lead: Lead;
  version: QuoteVersion;
}) {
  const { t } = useApp(),
    [draft, setDraft] = useState<QuoteDraft>(() => editable(version)),
    [sending, setSending] = useState(false),
    [dirty, setDirty] = useState(false),
    action = useAction();
  useEffect(() => {
    setDraft(editable(version));
    setDirty(false);
  }, [version.id]);
  const update = (fn: (d: QuoteDraft) => void) => {
    setDraft((d) => {
      const next = structuredClone(d);
      fn(next);
      return next;
    });
    setDirty(true);
  };
  const save = async () => {
    const result = await action.run(
      () =>
        request(`/quotes/${version.quoteId}/draft`, "PATCH", {
          versionId: version.id,
          draft,
        }),
      t.edited,
    );
    if (result) setDirty(false);
    return result;
  };
  return (
    <section className="panel quote-editor">
      <p className="eyebrow">
        V{version.number} / {t.draft}
      </p>
      <h2>{t.quoteEditor}</h2>
      <p>
        <small>{t.quoteEditorNote}</small>
      </p>
      <div className="form-grid">
        <Field id="valid-days" label={t.validDays}>
          <input
            id="valid-days"
            type="number"
            min="1"
            max="90"
            value={draft.validDays}
            onChange={(e) =>
              update((d) => {
                d.validDays = Number(e.target.value);
              })
            }
          />
        </Field>
        <Field id="quote-currency" label={t.currency}>
          <input id="quote-currency" value={draft.currency} readOnly />
        </Field>
        <Field id="discount" label={`${t.discount} (%)`}>
          <input
            id="discount"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={draft.discountBps / 100}
            onChange={(e) =>
              update((d) => {
                d.discountBps = Math.round(Number(e.target.value) * 100);
              })
            }
          />
        </Field>
        <Field id="tax" label={`${t.tax} (%)`}>
          <input
            id="tax"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={draft.taxBps / 100}
            onChange={(e) =>
              update((d) => {
                d.taxBps = Math.round(Number(e.target.value) * 100);
              })
            }
          />
        </Field>
      </div>
      {draft.options.map((option, oi) => (
        <QuoteOption
          key={option.id}
          draft={draft}
          update={update}
          version={version}
          oi={oi}
          dirty={dirty}
        />
      ))}
      <div className="actions" style={{ marginBlock: 24 }}>
        <Button
          variant="secondary"
          disabled={draft.options.length >= 3}
          onClick={() =>
            update((d) => {
              d.options.push({
                ...structuredClone(d.options[0]),
                id: crypto.randomUUID(),
                name: `${t.package} ${d.options.length + 1}`,
              });
            })
          }
        >
          <Plus size={15} />
          {t.addOption}
        </Button>
      </div>
      <Field id="quote-terms" label={t.terms}>
        <textarea
          id="quote-terms"
          value={draft.terms}
          onChange={(e) =>
            update((d) => {
              d.terms = e.target.value;
            })
          }
        />
      </Field>
      <div className="editor-footer">
        <Button variant="secondary" busy={action.pending} onClick={save}>
          {t.saveDraft}
        </Button>
        <Button
          disabled={dirty || action.pending}
          onClick={() => setSending(true)}
        >
          {t.sendQuote}
        </Button>
      </div>
      {sending && (
        <Confirm
          title={t.sendTitle}
          body={t.sendBody}
          busy={action.pending}
          onClose={() => setSending(false)}
          onConfirm={async () => {
            const result = await action.run(
              () =>
                request(`/quotes/${version.quoteId}/send`, "POST", {
                  versionId: version.id,
                }),
              t.proposalSent,
            );
            if (result) setSending(false);
          }}
        />
      )}
      <small className="request-reference">
        {lead.reference} / V{version.number}
      </small>
    </section>
  );
}
