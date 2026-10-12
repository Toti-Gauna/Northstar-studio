"use client";
import { Field } from "../components/ui";
import { BriefDocuments } from "./brief-documents";
import type { BriefFlow } from "./use-brief-flow";
export function BriefContextStep({ flow }: { flow: BriefFlow }) {
  const { t, locale, questions } = flow;
  const {
    register,
    formState: { errors },
  } = flow.form;
  return (
    <div className="form-grid">
      <Field id="title" label={t.title} error={errors.title?.message}>
        <input
          id="title"
          {...register("title", {
            required: t.required,
            minLength: { value: 4, message: t.required },
          })}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
      </Field>
      <Field id="name" label={t.name} error={errors.name?.message}>
        <input
          id="name"
          autoComplete="name"
          {...register("name", {
            required: t.required,
            minLength: { value: 2, message: t.required },
          })}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </Field>
      <Field id="email" label={t.email} error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email", {
            required: t.required,
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t.validEmail,
            },
          })}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
      </Field>
      <Field id="deadline" label={t.deadline} hint={t.deadlineHint}>
        <input id="deadline" type="date" {...register("deadline")} />
      </Field>
      {questions.map((q) => (
        <div className="full" key={q.id}>
          <Field
            id={q.id}
            label={q.label[locale]}
            hint={q.hint[locale]}
            error={errors.answers?.[q.id]?.message as string}
          >
            {q.type === "select" ? (
              <select
                id={q.id}
                {...register(`answers.${q.id}`, {
                  required: q.required ? t.required : false,
                })}
                aria-invalid={!!errors.answers?.[q.id]}
                aria-describedby={`${q.id}-hint ${errors.answers?.[q.id] ? q.id + "-error" : ""}`}
              >
                <option value="">— {t.select} —</option>
                {q.options?.map((o) => (
                  <option value={o.en} key={o.en}>
                    {o[locale]}
                  </option>
                ))}
              </select>
            ) : q.type === "number" ? (
              <input
                id={q.id}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                {...register(`answers.${q.id}`, {
                  required: q.required ? t.required : false,
                  min: { value: 0, message: t.validNumber },
                })}
                aria-invalid={!!errors.answers?.[q.id]}
                aria-describedby={`${q.id}-hint ${errors.answers?.[q.id] ? q.id + "-error" : ""}`}
              />
            ) : (
              <textarea
                id={q.id}
                {...register(`answers.${q.id}`, {
                  required: q.required ? t.required : false,
                })}
                aria-invalid={!!errors.answers?.[q.id]}
                aria-describedby={`${q.id}-hint ${errors.answers?.[q.id] ? q.id + "-error" : ""}`}
              />
            )}
          </Field>
        </div>
      ))}
      <div className="full">
        <Field id="source" label={t.source}>
          <select id="source" {...register("source")}>
            {[
              ["website", t.website],
              ["lead", t.lead],
              ["cold-email", t.coldEmail],
              ["referral", t.referral],
              ["in-person", t.inPerson],
            ].map(([v, s]) => (
              <option key={v} value={v}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="channel" label={t.channel}>
        <input id="channel" {...register("channel")} />
      </Field>
      <Field id="campaign" label={t.campaign}>
        <input id="campaign" {...register("campaign")} />
      </Field>
      <BriefDocuments flow={flow} />
    </div>
  );
}
