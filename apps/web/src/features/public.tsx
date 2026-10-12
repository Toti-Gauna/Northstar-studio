"use client";
import { money, type Copy, type Service } from "@northstar/contracts";
import { Check, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SiteFrame } from "../components/layout";
import { HeroMotion, ProcessDiagram } from "../components/motion";
import { useApi, useApp } from "../components/providers";
import { Empty, LinkButton, PageHeading, QueryState } from "../components/ui";
import { Cases } from "./cases";
import { LivePreview } from "./live-preview";
import { FinalCTA, Process, ServiceList } from "./marketing";
export function Home() {
  const { t, me } = useApp();
  return (
    <SiteFrame>
      <HeroMotion>
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow" data-hero>
              <span className="tiny-star">✦</span> {t.heroEyebrow}
            </p>
            <h1 data-hero>{t.heroTitle}</h1>
            <p className="lede" data-hero>
              {t.heroBody}
            </p>
            <div className="actions" data-hero>
              <LinkButton href="/brief/">{t.buildBrief}</LinkButton>
              <LinkButton href="/client/" secondary>
                {t.explore}
              </LinkButton>
            </div>
            <p className="hero-note" data-hero>
              <span className="small-line" />
              {t.heroNote}
            </p>
            <div className="hero-diagram">
              <ProcessDiagram compact />
            </div>
          </div>
          <div className="hero-composition">
            <span className="composition-ref" aria-hidden="true">
              {me?.brand.name.toUpperCase() || "NORTHSTAR"} / 01 —{" "}
              {t.scope.toUpperCase()}
            </span>
            <LivePreview />
            <span className="composition-caption">
              {t.brief.toUpperCase()} → {t.scope.toUpperCase()} →{" "}
              {t.proposal.toUpperCase()} → {t.project.toUpperCase()}
            </span>
          </div>
        </section>
      </HeroMotion>
      <ServiceList compact />
      <Cases compact />
      <Process compact />
      <FinalCTA />
    </SiteFrame>
  );
}
export function PublicPage({
  kind,
}: {
  kind: "services" | "cases" | "process" | "faq";
}) {
  const { t, locale } = useApp(),
    faq = useApi<{
      items: { id: string; data: { question: Copy; answer: Copy } }[];
    }>("/public/faq", kind === "faq");
  return (
    <SiteFrame>
      {kind === "services" ? (
        <ServiceList />
      ) : kind === "cases" ? (
        <Cases />
      ) : kind === "process" ? (
        <Process />
      ) : (
        <section className="wrap faq-section">
          <PageHeading eyebrow="04 / FAQ" title={t.faq} />
          <QueryState query={faq}>
            {faq.data?.items.length === 0 && <Empty />}
            {faq.data?.items.map((item) => (
              <details className="faq-item" key={item.id}>
                <summary>
                  {item.data.question[locale]}
                  <Plus size={20} />
                </summary>
                <p>{item.data.answer[locale]}</p>
              </details>
            ))}
          </QueryState>
        </section>
      )}
      <FinalCTA />
    </SiteFrame>
  );
}
export function ServiceDetail() {
  const { t, me, locale } = useApp(),
    params = useSearchParams(),
    id = params.get("id") || "",
    query = useApi<Service>(`/public/services/${id}`, !!id);
  if (!id)
    return (
      <SiteFrame>
        <Empty>
          <LinkButton href="/services/">{t.services}</LinkButton>
        </Empty>
      </SiteFrame>
    );
  return (
    <SiteFrame>
      <section className="wrap service-detail">
        <QueryState query={query}>
          {query.data && (
            <>
              <a className="text-link" href="/services/">
                ← {t.services}
              </a>
              <PageHeading
                eyebrow={t.services}
                title={query.data.data.name[locale]}
                body={query.data.data.description[locale]}
              />
              <div className="package-grid">
                {query.data.data.packages.map((p, i) => (
                  <article
                    className={`package-card ${i === 1 ? "featured" : ""}`}
                    key={p.id}
                  >
                    <span className="eyebrow">
                      0{i + 1} / {t.package}
                    </span>
                    <h2>{p.name[locale]}</h2>
                    <strong className="package-price">
                      {money(
                        p.prices[me?.brand.currency || "USD"],
                        me?.brand.currency || "USD",
                        locale,
                      )}
                    </strong>
                    <p>
                      {p.days} {t.days} / {p.revisions} {t.revisions}
                    </p>
                    <h4>{t.included}</h4>
                    <ul>
                      {p.included.map((x, i) => (
                        <li key={i}>
                          <Check size={16} />
                          {x[locale]}
                        </li>
                      ))}
                    </ul>
                    <h4>{t.excluded}</h4>
                    <ul className="muted">
                      {p.excluded.map((x, i) => (
                        <li key={i}>{x[locale]}</li>
                      ))}
                    </ul>
                    <LinkButton href={`/brief/?service=${id}&package=${p.id}`}>
                      {t.select}
                    </LinkButton>
                    <small>{t.estimate}</small>
                  </article>
                ))}
              </div>
            </>
          )}
        </QueryState>
      </section>
    </SiteFrame>
  );
}
