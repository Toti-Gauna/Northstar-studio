"use client";
import type { BrandSettings, Currency, Profile } from "@northstar/contracts";
import { useState } from "react";
import { useAction, useApp } from "../components/providers";
import { Button, Field, PageHeading } from "../components/ui";
import { request } from "../lib/api";
export function Settings() {
  const { me, t, locale, refresh } = useApp(),
    [brand, setBrand] = useState<BrandSettings>(me!.brand),
    [warning, setWarning] = useState(false),
    action = useAction();
  const field = (key: keyof BrandSettings, value: unknown) =>
    setBrand((b) => ({ ...b, [key]: value }));
  return (
    <>
      <PageHeading
        eyebrow={`${me!.brand.name} / ${t.settings}`}
        title={t.settings}
        body={t.settingsBody}
      />
      <div className="settings-layout">
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await action.run(
              () => request<any>("/operator/settings", "PATCH", brand),
              t.saved,
            );
            if (result) {
              setWarning(result.incompatibleHistoricalRequests > 0);
              await refresh();
            }
          }}
        >
          <div className="form-grid">
            <Field id="brand-name" label={t.brandName}>
              <input
                id="brand-name"
                required
                minLength={2}
                maxLength={80}
                value={brand.name}
                onChange={(e) => field("name", e.target.value)}
              />
            </Field>
            <Field id="brand-logo" label={t.logo}>
              <input
                id="brand-logo"
                required
                maxLength={6}
                value={brand.logoText}
                onChange={(e) => field("logoText", e.target.value)}
              />
            </Field>
            <Field id="brand-tag-en" label={t.taglineEn}>
              <input
                id="brand-tag-en"
                required
                value={brand.tagline.en}
                onChange={(e) =>
                  field("tagline", { ...brand.tagline, en: e.target.value })
                }
              />
            </Field>
            <Field id="brand-tag-es" label={t.taglineEs}>
              <input
                id="brand-tag-es"
                required
                value={brand.tagline.es}
                onChange={(e) =>
                  field("tagline", { ...brand.tagline, es: e.target.value })
                }
              />
            </Field>
            <div className="full">
              <Field id="brand-contact" label={t.contact}>
                <input
                  id="brand-contact"
                  type="email"
                  required
                  value={brand.contact}
                  onChange={(e) => field("contact", e.target.value)}
                />
              </Field>
            </div>
            {(["navy", "paper", "copper"] as const).map((key) => (
              <Field key={key} id={`brand-${key}`} label={t[key]}>
                <input
                  id={`brand-${key}`}
                  type="color"
                  value={brand[key]}
                  onChange={(e) => field(key, e.target.value)}
                />
              </Field>
            ))}
            <div className="full">
              <small>{t.settingsContrast}</small>
            </div>
            <Field id="brand-locale" label="Language / Idioma">
              <select
                id="brand-locale"
                value={brand.locale}
                onChange={(e) => field("locale", e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </Field>
            <Field id="brand-currency" label={t.currency}>
              <select
                id="brand-currency"
                value={brand.currency}
                onChange={(e) => field("currency", e.target.value as Currency)}
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </Field>
            <div className="full">
              <Field id="brand-profile" label={t.profile}>
                <select
                  id="brand-profile"
                  value={brand.profile}
                  onChange={(e) => field("profile", e.target.value as Profile)}
                >
                  {["digital", "architecture", "technical"].map((p) => (
                    <option key={p} value={p}>
                      {(t as any)[p]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="full">
              <Field id="brand-timezone" label={t.timezone}>
                <input
                  id="brand-timezone"
                  required
                  value={brand.timezone}
                  onChange={(e) => field("timezone", e.target.value)}
                />
              </Field>
            </div>
          </div>
          <Button type="submit" busy={action.pending}>
            {t.saveSettings}
          </Button>
          {warning && (
            <p className="history-warning" role="status">
              {t.historyWarning}
            </p>
          )}
        </form>
        <aside
          className="brand-preview"
          style={{ color: brand.navy, background: brand.paper }}
        >
          <p className="eyebrow" style={{ color: brand.copper }}>
            {t.previewBrand}
          </p>
          <strong>
            {brand.logoText} / {brand.name}
          </strong>
          <h2>{t.heroTitle}</h2>
          <p>
            {brand.tagline[locale]}
            <br />
            {brand.currency} / {(t as any)[brand.profile]}
          </p>
          <span
            className="button"
            style={{ background: brand.navy, color: brand.paper }}
          >
            {t.buildBrief}
          </span>
          <p className="history-warning">{t.historyWarning}</p>
        </aside>
      </div>
    </>
  );
}
