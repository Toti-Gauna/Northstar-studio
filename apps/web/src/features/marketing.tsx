"use client";
import { type Service } from "@northstar/contracts";
import { ArrowUpRight } from "lucide-react";
import { ProcessDiagram } from "../components/motion";
import { useApi, useApp } from "../components/providers";
import { Empty, LinkButton, QueryState } from "../components/ui";

export function ServiceList({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useApp(),
    query = useApi<{ items: Service[] }>("/public/services");
  return (
    <section className="services-section wrap">
      <div className="section-heading">
        <p className="eyebrow">01 / {t.services}</p>
        <h2>{t.serviceIntro}</h2>
        {!compact && <p>{t.serviceBody}</p>}
      </div>
      <QueryState query={query}>
        {query.data?.items.length === 0 && <Empty text={t.noPublished} />}
        <div className="service-list">
          {query.data?.items.map((s, i) => (
            <a className="service-row" key={s.id} href={`/service/?id=${s.id}`}>
              <span className="service-number">0{i + 1}</span>
              <div>
                <h3>{s.data.name[locale]}</h3>
                <p>{s.data.summary[locale]}</p>
              </div>
              <span className="service-tags">
                {s.data.packages.map((p) => p.name[locale]).join(" / ")}
              </span>
              <span className="circle-arrow">
                <ArrowUpRight size={23} />
              </span>
            </a>
          ))}
        </div>
      </QueryState>
      {compact && (
        <a className="text-link" href="/services/">
          {t.viewAll}
          <ArrowUpRight size={17} />
        </a>
      )}
    </section>
  );
}

export function Process({ compact = false }: { compact?: boolean }) {
  const { t } = useApp();
  return (
    <section className="process-section wrap">
      <div className="section-heading">
        <p className="eyebrow">03 / {t.process}</p>
        <h2>{t.processIntro}</h2>
        <p>{t.processBody}</p>
      </div>
      <ProcessDiagram />
      {!compact && (
        <div className="process-steps">
          {t.processSteps.map((step, i) => (
            <article key={i}>
              <span>0{i + 1}</span>
              <h3>{step}</h3>
              <p>{t.processDescriptions[i]}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function FinalCTA() {
  const { t } = useApp();
  return (
    <section className="final-cta wrap">
      <span className="large-star" aria-hidden="true">
        ✦
      </span>
      <div>
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaBody}</p>
      </div>
      <LinkButton href="/brief/">{t.buildBrief}</LinkButton>
    </section>
  );
}
