"use client";
import { useApi, useApp } from "../components/providers";
import { dateTime } from "../lib/format";

export function ActivityRail({ entity }: { entity: string }) {
  const { t, me, locale } = useApp(),
    query = useApi<{ items: any[] }>(`/activity?entity=${entity}`);
  return (
    <aside className="activity-rail">
      <h3>{t.activity}</h3>
      <div>
        {query.data?.items.length ? (
          query.data.items.map((e) => (
            <div className="activity-item" key={e.id}>
              <span>{eventLabel(e.type, t)}</span>
              <small>{dateTime(e.createdAt, locale, me!.brand.timezone)}</small>
            </div>
          ))
        ) : (
          <small>{t.noActivity}</small>
        )}
      </div>
    </aside>
  );
}

export function eventLabel(type: string, t: any) {
  const map: Record<string, string> = {
    "lead.created": t.received,
    "lead.qualified": t.qualified,
    "lead.lost": t.lost,
    "quote.sent": t.proposalSent,
    "quote.drafted": t.draft,
    "quote.edited": t.edited,
    "quote.accepted": t.accepted,
    "quote.declined": t.declined,
    "quote.expired": t.expired,
    "quote.local_reminder": t.notifications,
    "quote.pdf_downloaded": t.pdf,
    "comment.added": t.comments,
    "project.created": t.projectCreated,
    "task.updated": t.projects,
    "milestone.updated": t.milestones,
    "attachment.created": t.documents,
    "attachment.downloaded": t.download,
    "content.created": t.content,
    "content.draft_saved": t.saved,
    "content.published": t.published,
    "content.archived": t.archived,
    "settings.updated": t.settings,
    "workspace.created": t.isolated,
    "session.role_changed": t.identity,
    "workspace.reset": t.reset,
    "lead.received": t.received,
  };
  return map[type] || type;
}
