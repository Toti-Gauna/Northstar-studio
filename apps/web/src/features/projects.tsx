"use client";
import { money } from "@northstar/contracts";
import { ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAction, useApi, useApp } from "../components/providers";
import {
  Button,
  Empty,
  LinkButton,
  PageHeading,
  QueryState,
  Status,
} from "../components/ui";
import { download, request } from "../lib/api";
import { dateTime } from "../lib/format";
import type { List, Project } from "../lib/types";
import { Scope } from "./proposal-scope";
export function ProjectList({ operator }: { operator: boolean }) {
  const { t, me } = useApp(),
    params = useSearchParams(),
    router = useRouter(),
    page = Number(params.get("page")) || 1,
    query = useApi<List<Project>>(`/projects?page=${page}`),
    base = operator ? "/operator/" : "/client/";
  return (
    <>
      <PageHeading
        eyebrow={`${me!.brand.name} / ${t.project}`}
        title={t.projects}
        body={t.projectBody}
      />
      <QueryState query={query}>
        {query.data?.items.length ? (
          query.data.items.map((p) => (
            <a
              className="project-card"
              href={`${base}?view=project&id=${p.id}`}
              key={p.id}
            >
              <div>
                <h3>{p.title}</h3>
                <small>
                  {p.id.slice(0, 8)} / {t.project}
                </small>
              </div>
              <span className="circle-arrow">
                <ArrowUpRight size={20} />
              </span>
            </a>
          ))
        ) : (
          <Empty>
            <LinkButton href="/brief/">{t.newBrief}</LinkButton>
          </Empty>
        )}
        <div className="pagination">
          <span>
            {t.page} {page} /{" "}
            {Math.max(1, Math.ceil((query.data?.total || 0) / 10))}
          </span>
          <div className="actions">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() =>
                router.replace(`${base}?view=projects&page=${page - 1}`)
              }
            >
              {t.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page * 10 >= (query.data?.total || 0)}
              onClick={() =>
                router.replace(`${base}?view=projects&page=${page + 1}`)
              }
            >
              {t.next}
            </Button>
          </div>
        </div>
      </QueryState>
    </>
  );
}
export function ProjectDetail({
  id,
  operator,
}: {
  id: string;
  operator: boolean;
}) {
  const { t, locale, me } = useApp(),
    query = useApi<Project>(`/projects/${id}`, !!id),
    action = useAction();
  const project = query.data;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const heading = root.current?.querySelector("h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  }, [project?.id]);
  return (
    <div className="project-arrival" ref={root}>
      <QueryState query={query}>
        {project && (
          <>
            <a
              className="text-link"
              href={`${operator ? "/operator/" : "/client/"}?view=projects`}
            >
              ← {t.projects}
            </a>
            <PageHeading
              eyebrow={project.reference}
              title={project.title}
              body={t.projectBody}
            >
              <Button
                variant="secondary"
                busy={action.pending}
                onClick={() =>
                  action.run(
                    () =>
                      download(
                        `/quotes/${project.quoteId}/pdf?version=${project.acceptance.versionId}`,
                        `${project.reference}.pdf`,
                      ),
                    t.downloaded,
                  )
                }
              >
                {t.pdf}
              </Button>
            </PageHeading>
            <p className="request-reference">
              {t.leadId}: {project.leadId}
            </p>
            <div className="panel">
              <p className="eyebrow">{t.acceptanceRecord}</p>
              <div className="between">
                <h2>{project.option.name}</h2>
                <Status value="accepted" />
              </div>
              <p>
                {money(
                  project.acceptance.amountMinor,
                  project.acceptance.currency,
                  locale,
                )}{" "}
                ·{" "}
                {dateTime(
                  project.acceptance.createdAt,
                  locale,
                  me!.brand.timezone,
                )}
              </p>
              <small>{t.acceptBody}</small>
              <details className="snapshot-details">
                <summary>
                  {t.snapshot}
                  <ArrowUpRight size={15} />
                </summary>
                <Scope scope={project.option.scope} />
                <p className="request-reference">
                  SHA-256: {project.acceptance.snapshotHash}
                </p>
              </details>
            </div>
            <section className="panel">
              <h2>{t.milestones}</h2>
              {project.milestones.map((m, i) => (
                <article className="project-milestone" key={m.id}>
                  <div className="milestone-title">
                    <h3>
                      0{i + 1} / {m.title[locale]}
                    </h3>
                    {operator ? (
                      <>
                        <label
                          className="sr-only"
                          htmlFor={`milestone-${m.id}`}
                        >
                          {m.title[locale]} · {t.status}
                        </label>
                        <select
                          id={`milestone-${m.id}`}
                          value={m.status}
                          disabled={action.pending}
                          onChange={(e) =>
                            action.run(
                              () =>
                                request(`/milestones/${m.id}`, "PATCH", {
                                  status: e.target.value,
                                }),
                              t.saved,
                            )
                          }
                        >
                          {["planned", "active", "complete"].map((s) => (
                            <option key={s} value={s}>
                              {(t as any)[s]}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <Status value={m.status} />
                    )}
                  </div>
                  {m.tasks.map((task) => (
                    <div className="task" key={task.id}>
                      {task.status === "done" ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Clock size={18} />
                      )}
                      <div>
                        {task.title[locale]}
                        <small>
                          {task.owner === "customer"
                            ? t.clientOwner
                            : t.provider}
                        </small>
                      </div>
                      <div>
                        <label className="sr-only" htmlFor={`task-${task.id}`}>
                          {task.title[locale]} · {t.status}
                        </label>
                        <select
                          id={`task-${task.id}`}
                          value={task.status}
                          disabled={
                            action.pending ||
                            (!operator && task.owner !== "customer")
                          }
                          onChange={(e) =>
                            action.run(
                              () =>
                                request(`/tasks/${task.id}`, "PATCH", {
                                  status: e.target.value,
                                }),
                              t.saved,
                            )
                          }
                        >
                          {["todo", "doing", "done"].map((s) => (
                            <option key={s} value={s}>
                              {(t as any)[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </article>
              ))}
            </section>
          </>
        )}
      </QueryState>
    </div>
  );
}
