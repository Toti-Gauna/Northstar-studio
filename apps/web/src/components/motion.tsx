"use client";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";
import { useApp } from "./providers";
gsap.registerPlugin(useGSAP, ScrollTrigger);
export function HeroMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero]", {
          y: 14,
          opacity: 0.75,
          duration: 0.56,
          stagger: 0.08,
          ease: "power2.out",
        });
      });
      return () => media.revert();
    },
    { scope: ref },
  );
  return <div ref={ref}>{children}</div>;
}
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, {
          y: 12,
          opacity: 1,
          duration: 0.3,
          scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
        });
      });
      return () => media.revert();
    },
    { scope: ref },
  );
  return <div ref={ref}>{children}</div>;
}
export function ProcessDiagram({ compact = false }: { compact?: boolean }) {
  const { t } = useApp(),
    ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".process-trace",
          { strokeDashoffset: 600 },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 85%",
              end: "bottom 35%",
              scrub: 0.6,
            },
          },
        );
      });
      return () => media.revert();
    },
    { scope: ref },
  );
  return (
    <div ref={ref}>
      <svg
        className={`process-svg desktop-diagram ${compact ? "compact" : ""}`}
        viewBox="0 0 800 235"
        role="img"
        aria-label={`${t.brief} → ${t.scope} → ${t.proposal} → ${t.project}`}
      >
        <defs>
          <pattern
            id={compact ? "grid-small" : "grid-large"}
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M32 0H0V32"
              fill="none"
              stroke="currentColor"
              opacity=".07"
            />
          </pattern>
        </defs>
        <rect
          width="800"
          height="235"
          fill={`url(#${compact ? "grid-small" : "grid-large"})`}
        />
        <path
          d="M95 110 C175 110 155 60 270 60 S390 170 475 170 S590 95 700 95"
          stroke="currentColor"
          opacity=".14"
          fill="none"
        />
        <path
          className="process-trace"
          d="M95 110 C175 110 155 60 270 60 S390 170 475 170 S590 95 700 95"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeDasharray="600"
          fill="none"
        />
        {[
          [95, 110, t.brief],
          [270, 60, t.scope],
          [475, 170, t.proposal],
          [700, 95, t.project],
        ].map(([x, y, label], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="22"
              fill="var(--paper)"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d={`M${Number(x) - 7} ${y}H${Number(x) + 7}M${x} ${Number(y) - 7}V${Number(y) + 7}`}
              stroke="var(--accent)"
            />
            <text
              x={x}
              y={Number(y) + 45}
              textAnchor="middle"
              fill="currentColor"
              fontSize="13"
              fontFamily="Inter, sans-serif"
            >
              0{i + 1} / {label}
            </text>
          </g>
        ))}
        <circle cx="390" cy="45" r="3" fill="var(--accent)" />
        <circle cx="600" cy="205" r="2" fill="var(--accent)" />
        <path d="M758 24h12m-6-6v12M28 197h12m-6-6v12" stroke="var(--accent)" />
      </svg>
      <svg
        className="process-svg mobile-diagram"
        viewBox="0 0 400 250"
        role="img"
        aria-label={`${t.brief} → ${t.scope} → ${t.proposal} → ${t.project}`}
      >
        <path d="M35 35V215" stroke="currentColor" opacity=".16" />
        <path
          className="process-trace"
          d="M35 35V215"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeDasharray="600"
        />
        {[t.brief, t.scope, t.proposal, t.project].map((label, i) => (
          <g key={label}>
            <circle
              cx="35"
              cy={35 + i * 60}
              r="16"
              fill="var(--paper)"
              stroke="currentColor"
            />
            <path
              d={`M29 ${35 + i * 60}h12M35 ${29 + i * 60}v12`}
              stroke="var(--accent)"
            />
            <text
              x="70"
              y={40 + i * 60}
              fill="currentColor"
              fontSize="15"
              fontFamily="Inter, sans-serif"
            >
              0{i + 1} / {label}
            </text>
          </g>
        ))}
        <path
          d="M340 40h18m-9-9v18M285 200h12m-6-6v12"
          stroke="var(--accent)"
        />
      </svg>
    </div>
  );
}
