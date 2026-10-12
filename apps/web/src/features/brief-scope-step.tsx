"use client";
import { money } from "@northstar/contracts";
import { Field } from "../components/ui";
import type { BriefFlow } from "./use-brief-flow";
export function BriefScopeStep({ flow }: { flow: BriefFlow }) {
  const { me, t, locale, services, values, service, selectService } = flow;
  const {
    setValue,
    formState: { errors },
  } = flow.form;
  return (
    <div className="form-stack">
      <Field id="service" label={t.chooseService}>
        <select
          id="service"
          value={values.serviceId}
          onChange={(e) => selectService(e.target.value)}
        >
          {services.data?.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.data.name[locale]}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="plain-fieldset">
        <legend>{t.package}</legend>
        <div className="choice-list">
          {service?.data.packages.map((p) => (
            <button
              type="button"
              className="choice"
              key={p.id}
              aria-pressed={p.id === values.packageId}
              onClick={() => setValue("packageId", p.id)}
            >
              <span>{p.name[locale]}</span>
              <small>
                {money(
                  p.prices[me!.brand.currency],
                  me!.brand.currency,
                  locale,
                )}
                <br />
                {p.days} {t.days} / {p.revisions} {t.revisions}
              </small>
            </button>
          ))}
        </div>
      </fieldset>
      <Field
        id="quantity"
        label={`${t.quantity} / ${service?.data.unit[locale] || ""}`}
        error={errors.quantity100?.message}
      >
        <input
          id="quantity"
          type="number"
          min="1"
          max="100"
          step="1"
          value={(values.quantity100 || 100) / 100}
          onChange={(e) =>
            setValue("quantity100", Math.round(Number(e.target.value) * 100))
          }
        />
      </Field>
      <fieldset className="plain-fieldset">
        <legend>{t.addons}</legend>
        {service?.data.addons.map((a) => (
          <label className="check" key={a.id}>
            <input
              type="checkbox"
              checked={values.addonIds.includes(a.id)}
              onChange={(e) =>
                setValue(
                  "addonIds",
                  e.target.checked
                    ? [...values.addonIds, a.id]
                    : values.addonIds.filter((id) => id !== a.id),
                )
              }
            />
            {a.name[locale]} ·{" "}
            {money(a.prices[me!.brand.currency], me!.brand.currency, locale)}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
