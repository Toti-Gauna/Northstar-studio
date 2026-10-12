"use client";
import { useState } from "react";
import { useAction, useApp } from "../components/providers";
import { Button, Field } from "../components/ui";
import { request } from "../lib/api";
import { dateTime } from "../lib/format";
import type { Lead } from "../lib/types";

export function Comments({
  lead,
  operator,
}: {
  lead: Lead;
  operator: boolean;
}) {
  const { t, me, locale } = useApp(),
    [body, setBody] = useState(""),
    [visibility, setVisibility] = useState<"public" | "private">("public"),
    action = useAction();
  return (
    <section className="panel">
      <h2>{t.comments}</h2>
      {lead.comments?.length ? (
        lead.comments.map((c) => (
          <article className={`comment ${c.visibility}`} key={c.id}>
            <div className="between">
              <strong>{c.author}</strong>
              <small>{c.visibility === "private" ? t.private : t.public}</small>
            </div>
            <p>{c.body}</p>
            <small>{dateTime(c.createdAt, locale, me!.brand.timezone)}</small>
          </article>
        ))
      ) : (
        <p>
          <small>{t.noComments}</small>
        </p>
      )}
      <form
        className="form-stack"
        style={{ marginTop: 22 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await action.run(
            () =>
              request(`/leads/${lead.id}/comments`, "POST", {
                body,
                visibility,
              }),
            t.saved,
          );
          if (result) setBody("");
        }}
      >
        <Field id="comment" label={t.commentLabel}>
          <textarea
            id="comment"
            value={body}
            required
            maxLength={4000}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        {operator && (
          <label className="check">
            <input
              type="checkbox"
              checked={visibility === "private"}
              onChange={(e) =>
                setVisibility(e.target.checked ? "private" : "public")
              }
            />
            {t.privateNote}
          </label>
        )}
        <div>
          <Button type="submit" busy={action.pending} disabled={!body.trim()}>
            {t.postComment}
          </Button>
        </div>
      </form>
    </section>
  );
}
