"use client";
import { SiteLink } from "../components/site-link";
import { type Copy } from "@northstar/contracts";
import { ArrowUpRight, Plus } from "lucide-react";
import { Reveal } from "../components/motion";
import { useApi, useApp } from "../components/providers";
import { Empty, QueryState } from "../components/ui";
type Case = {
  id: string;
  data: {
    title: Copy;
    summary: Copy;
    challenge: Copy;
    approach: Copy;
    tag: Copy;
  };
};

export function Cases({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useApp(),
    query = useApi<{ items: Case[] }>("/public/cases");
  return (
    <section className="cases-section wrap">
      <div className="section-heading">
        <p className="eyebrow">02 / {t.cases}</p>
        <h2>{t.caseIntro}</h2>
        <p>{t.caseBody}</p>
      </div>
      <QueryState query={query}>
        {query.data?.items.length === 0 && <Empty text={t.noCases} />}
        <div className="cases-grid">
          {query.data?.items.slice(0, compact ? 2 : undefined).map((c, i) => (
            <Reveal key={c.id}>
              <article className="case-card">
                <div className={`case-art art-${i % 2}`} aria-hidden="true">
                  <svg viewBox="0 0 500 270">
                    <defs>
                      <pattern
                        id={`case-grid-${i}`}
                        width="30"
                        height="30"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M30 0H0V30"
                          stroke="currentColor"
                          opacity=".16"
                          fill="none"
                        />
                      </pattern>
                    </defs>
                    <rect
                      width="500"
                      height="270"
                      fill={`url(#case-grid-${i})`}
                    />
                    {i % 2 === 0 ? (
                      <>
                        <rect
                          x="110"
                          y="50"
                          width="240"
                          height="160"
                          fill="var(--surface)"
                          stroke="currentColor"
                        />
                        <rect
                          x="140"
                          y="75"
                          width="170"
                          height="25"
                          fill="var(--navy)"
                        />
                        <path
                          d="M140 125h110m-110 18h150m-150 18h130"
                          stroke="currentColor"
                        />
                        <circle cx="335" cy="200" r="43" fill="var(--accent)" />
                        <path d="M315 200h40m-20-20v40" stroke="var(--paper)" />
                        <path d="M70 80h30m-15-15v30" stroke="var(--accent)" />
                      </>
                    ) : (
                      <>
                        <path
                          d="M120 70L300 40 380 170 200 220Z"
                          fill="var(--surface)"
                          stroke="currentColor"
                        />
                        <path
                          d="M120 70L200 220M300 40L200 220M120 70L380 170"
                          fill="none"
                          stroke="currentColor"
                        />
                        <circle cx="200" cy="220" r="18" fill="var(--accent)" />
                        <circle cx="300" cy="40" r="6" fill="var(--accent)" />
                        <path
                          d="M320 210h40m-20-20v40"
                          stroke="var(--accent)"
                        />
                      </>
                    )}
                    <text x="28" y="245" fontSize="12" fill="currentColor">
                      N / 0{i + 1} — {t.caseLabel}
                    </text>
                  </svg>
                </div>
                <div className="case-copy">
                  <span className="eyebrow">{t.caseLabel}</span>
                  <h3>{c.data.title[locale]}</h3>
                  <p>{c.data.summary[locale]}</p>
                  {!compact && (
                    <details>
                      <summary>
                        {t.showDetails}
                        <Plus size={17} />
                      </summary>
                      <h4>{t.challenge}</h4>
                      <p>{c.data.challenge[locale]}</p>
                      <h4>{t.approach}</h4>
                      <p>{c.data.approach[locale]}</p>
                    </details>
                  )}
                  {compact && (
                    <SiteLink className="text-link" href="/cases/">
                      {t.showDetails}
                      <ArrowUpRight size={16} />
                    </SiteLink>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </QueryState>
    </section>
  );
}
