"use client";
import { SiteLink } from "../components/site-link";
import { useGSAP } from "@gsap/react";
import { money, type Service } from "@northstar/contracts";
import { useQuery } from "@tanstack/react-query";
import { gsap } from "gsap";
import { ArrowUpRight, Check } from "lucide-react";
import { useRef, useState } from "react";
import { useApi, useApp } from "../components/providers";
import { Button, Empty } from "../components/ui";
import { request, STATIC_PREVIEW } from "../lib/api";

export function LivePreview() {
  const { me, locale, t } = useApp(),
    services = useApi<{ items: Service[] }>("/public/services"),
    [serviceId, setService] = useState(""),
    [pkgId, setPkg] = useState(""),
    [quantity, setQuantity] = useState(1),
    [addons, setAddons] = useState<string[]>([]),
    ref = useRef<HTMLDivElement>(null);
  const service =
    services.data?.items.find((s) => s.id === serviceId) ||
    services.data?.items[0];
  const pkg =
    service?.data.packages.find((p) => p.id === pkgId) ||
    service?.data.packages[0];
  const input = {
    serviceId: service?.id,
    packageId: pkg?.id,
    quantity100: Math.round(quantity * 100),
    addonIds: addons,
    currency: me?.brand.currency || "USD",
  };
  const estimate = useQuery<any>({
    queryKey: [me?.workspaceId, me?.userId, "estimate", input],
    queryFn: ({ signal }) => request("/estimates", "POST", input, signal),
    enabled: !!me && !!service && !!pkg,
  });
  useGSAP(
    () => {
      if (
        estimate.data &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        gsap.from(".preview-amount,.preview-lines", {
          y: 5,
          opacity: 0.7,
          duration: 0.2,
        });
    },
    { scope: ref, dependencies: [estimate.data] },
  );
  if (services.data?.items.length === 0)
    return (
      <div className="live-preview">
        <Empty text={t.noPublished} />
      </div>
    );
  return (
    <div className="live-preview" ref={ref} data-hero>
      <div className="between">
        <span className="eyebrow">{t.preview}</span>
        <span className="live-dot" aria-hidden="true" />
      </div>
      <p className="preview-note">
        {STATIC_PREVIEW ? t.staticPreview : t.previewNote}
      </p>
      <label htmlFor="preview-service" className="sr-only">
        {t.services}
      </label>
      <select
        id="preview-service"
        value={service?.id || ""}
        onChange={(e) => {
          setService(e.target.value);
          setPkg("");
          setAddons([]);
        }}
      >
        {services.data?.items.map((s) => (
          <option key={s.id} value={s.id}>
            {s.data.name[locale]}
          </option>
        ))}
      </select>
      <div className="preview-packages" role="group" aria-label={t.package}>
        {service?.data.packages.map((p) => (
          <button
            key={p.id}
            aria-pressed={pkg?.id === p.id}
            onClick={() => setPkg(p.id)}
          >
            {p.name[locale]}
          </button>
        ))}
      </div>
      <div className="preview-lines">
        {pkg?.included.map((item, i) => (
          <div key={i}>
            <Check size={15} />
            <span>{item[locale]}</span>
            <span>0{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="preview-options">
        <label htmlFor="preview-quantity">
          {t.quantity} <small>{service?.data.unit[locale]}</small>
        </label>
        <input
          disabled={STATIC_PREVIEW}
          id="preview-quantity"
          type="number"
          min="1"
          max="100"
          step="1"
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.min(100, Math.max(1, Number(e.target.value))))
          }
        />
      </div>
      {service?.data.addons.slice(0, 1).map((a) => (
        <label className="check compact" key={a.id}>
          <input
            disabled={STATIC_PREVIEW}
            type="checkbox"
            checked={addons.includes(a.id)}
            onChange={(e) =>
              setAddons(
                e.target.checked
                  ? [...addons, a.id]
                  : addons.filter((id) => id !== a.id),
              )
            }
          />
          <span>{a.name[locale]}</span>
        </label>
      ))}
      <div className="preview-total" aria-live="polite">
        <div>
          <small>{t.estimate}</small>
          <strong className="preview-amount">
            {estimate.isFetching
              ? t.estimateLoading
              : estimate.data
                ? money(estimate.data.totals.totalMinor, input.currency, locale)
                : "—"}
          </strong>
          <small>
            {pkg?.days}–{(pkg?.days || 0) + 7} {t.days}
          </small>
        </div>
        <span className="preview-star" aria-hidden="true">
          ✦
        </span>
      </div>
      {estimate.isError && (
        <Button variant="quiet" onClick={() => estimate.refetch()}>
          {t.estimateFailed} · {t.retry}
        </Button>
      )}
      <SiteLink
        className="preview-cta"
        href={
          service
            ? `/brief/?service=${service.id}&package=${pkg?.id}`
            : "/brief/"
        }
      >
        {t.buildBrief}
        <ArrowUpRight size={18} />
      </SiteLink>
      <div className="preview-orbit" aria-hidden="true">
        <svg viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="165" />
          <circle cx="200" cy="200" r="125" />
          <path d="M30 200H370M200 30V370" />
        </svg>
      </div>
    </div>
  );
}
