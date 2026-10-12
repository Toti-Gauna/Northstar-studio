"use client";
import type { DemoIdentity } from "@northstar/contracts";
import { ArrowUpRight, Compass, LogOut, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useAction, useApp } from "./providers";
import { DemoTour } from "./tour";
import { Button, Confirm } from "./ui";
export function Brand() {
  const { me, locale } = useApp();
  return (
    <a className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">
        {me?.brand.logoText || "N✦"}
      </span>
      <span>
        <strong>{me?.brand.name || "Northstar"}</strong>
        <small>{me?.brand.tagline[locale] || "Service Studio"}</small>
      </span>
    </a>
  );
}
export function DemoControls() {
  const { me, locale, setLocale, switchRole, t, toast } = useApp(),
    action = useAction();
  const labels: Record<DemoIdentity, string> = {
    customer: t.customer,
    "customer-2": t.customer2,
    "customer-3": t.customer3,
    operator: t.operatorIdentity,
  };
  return (
    <div className="demo-controls">
      <label className="sr-only" htmlFor="language">
        Language / Idioma
      </label>
      <select
        id="language"
        value={locale}
        onChange={(e) => setLocale(e.target.value as "en" | "es")}
        aria-label="Language / Idioma"
      >
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
      {me && (
        <>
          <label className="sr-only" htmlFor="demo-role">
            {t.identity}
          </label>
          <select
            id="demo-role"
            value={me.identity}
            disabled={action.pending}
            onChange={async (e) => {
              const identity = e.target.value as DemoIdentity;
              const result = await action.run(async () => {
                await switchRole(identity);
                return true;
              });
              if (result) {
                toast(labels[identity]);
                window.location.assign(
                  identity === "operator" ? "/operator/" : "/client/",
                );
              }
            }}
          >
            {me.allowedIdentities.map((i) => (
              <option key={i} value={i}>
                {labels[i]}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
export function SiteFrame({ children }: { children: ReactNode }) {
  const { me, t, sessionError, start } = useApp(),
    pathname = usePathname();
  const [menu, setMenu] = useState(false);
  return (
    <div
      style={
        {
          "--navy": me?.brand.navy,
          "--paper": me?.brand.paper,
          "--accent": me?.brand.copper,
        } as CSSProperties
      }
    >
      <a className="skip" href="#main">
        Skip to content / Saltar al contenido
      </a>
      <div className="demo-ribbon">
        <span>{t.demo}</span>
        <span className="ribbon-note">D01 / {t.isolated}</span>
      </div>
      <header className="site-header wrap">
        <Brand />
        <nav className={menu ? "open" : ""} aria-label={t.home}>
          {[
            ["/services/", t.services],
            ["/cases/", t.cases],
            ["/process/", t.process],
            ["/faq/", t.faq],
          ].map(([href, label]) => (
            <a
              href={href}
              key={href}
              aria-current={
                pathname === href || pathname + "/" === href
                  ? "page"
                  : undefined
              }
            >
              {label}
            </a>
          ))}
        </nav>
        <DemoControls />
        <button
          className="menu-toggle"
          onClick={() => setMenu(!menu)}
          aria-label={t.services}
          aria-expanded={menu}
        >
          <Menu size={22} />
        </button>
      </header>
      <main id="main">
        {sessionError && (
          <div className="wrap history-warning" role="alert">
            <p>{t.sessionError}</p>
            <Button variant="secondary" onClick={() => start()}>
              {t.retry}
            </Button>
          </div>
        )}
        {children}
      </main>
      <footer className="site-footer wrap">
        <Brand />
        <p>
          {t.demo}
          <br />
          <span>{t.noExternal}</span>
        </p>
        <a href="/client/">
          {t.client}
          <ArrowUpRight size={15} />
        </a>
        <a href="/operator/">
          {t.operator}
          <ArrowUpRight size={15} />
        </a>
      </footer>
      <DemoTour />
    </div>
  );
}
export function SessionGate({
  children,
  role,
}: {
  children: ReactNode;
  role?: "customer" | "operator";
}) {
  const { me, t, loading, sessionError, start, switchRole } = useApp(),
    action = useAction();
  if (loading) return <div className="empty">{t.loading}</div>;
  if (!me)
    return (
      <div className="session-gate">
        <span className="star">✦</span>
        <h1>{sessionError ? t.sessionError : t.sessionEnded}</h1>
        <Button busy={action.pending} onClick={() => action.run(start)}>
          {sessionError ? t.retry : t.startSession}
        </Button>
      </div>
    );
  if (role && role !== me.role)
    return (
      <div className="session-gate">
        <h1>{role === "operator" ? t.operator : t.client}</h1>
        <p>{t.isolated}</p>
        <Button
          busy={action.pending}
          onClick={() =>
            action.run(() =>
              switchRole(role === "operator" ? "operator" : "customer"),
            )
          }
        >
          {role === "operator" ? t.operatorIdentity : t.customer}
        </Button>
      </div>
    );
  return children;
}
export function PortalFrame({
  children,
  operator,
  view,
}: {
  children: ReactNode;
  operator: boolean;
  view: string;
}) {
  const { me, t, end } = useApp(),
    action = useAction(),
    [reset, setReset] = useState(false);
  const base = operator ? "/operator/" : "/client/";
  const nav = operator
    ? [
        ["inbox", t.inbox],
        ["projects", t.projects],
        ["content", t.content],
        ["settings", t.settings],
        ["notifications", t.notifications],
        ["outbox", t.outbox],
        ["activity", t.activity],
        ["analytics", t.analytics],
      ]
    : [
        ["requests", t.requests],
        ["projects", t.projects],
        ["notifications", t.notifications],
        ["activity", t.activity],
      ];
  return (
    <SiteFrame>
      <div className="portal wrap">
        <aside className="portal-sidebar">
          <p className="eyebrow">{operator ? t.operator : t.client}</p>
          <div className="workspace-label">
            <Compass size={17} />
            <span>
              {me?.name}
              <small>{me?.workspaceId.slice(0, 8)} / Demo</small>
            </span>
          </div>
          <nav aria-label={operator ? t.operator : t.client}>
            {nav.map(([key, label]) => (
              <a
                key={key}
                href={`${base}?view=${key}`}
                className={view === key ? "selected" : ""}
              >
                {label}
                <ArrowUpRight size={14} />
              </a>
            ))}
          </nav>
          <a className="button secondary" href="/brief/">
            {t.newBrief}
          </a>
          <div className="sidebar-bottom">
            <Button variant="quiet" onClick={() => setReset(true)}>
              {t.reset}
            </Button>
            <Button
              variant="quiet"
              busy={action.pending}
              onClick={() => action.run(() => end(false))}
            >
              <LogOut size={14} />
              {t.logout}
            </Button>
          </div>
        </aside>
        <section className="portal-main">
          <SessionGate role={operator ? "operator" : "customer"}>
            {children}
          </SessionGate>
        </section>
      </div>
      {reset && (
        <Confirm
          title={t.resetTitle}
          body={t.resetBody}
          onClose={() => setReset(false)}
          busy={action.pending}
          onConfirm={async () => {
            await action.run(() => end(true));
            setReset(false);
          }}
        />
      )}
    </SiteFrame>
  );
}
