"use client";
import { type ContentKind } from "@northstar/contracts";
import { ArrowUpRight, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAction, useApi, useApp } from "../components/providers";
import {
  Button,
  Confirm,
  Field,
  Modal,
  PageHeading,
  QueryState,
  Status,
} from "../components/ui";
import { request } from "../lib/api";
import { ContentQuickEdit, PreviewContent } from "./content-fields";
export function ContentStudio() {
  const { t, locale, me, toast } = useApp(),
    params = useSearchParams(),
    router = useRouter(),
    kind = (
      ["service", "case", "faq", "template"].includes(params.get("kind") || "")
        ? params.get("kind")
        : "service"
    ) as ContentKind,
    query = useApi<{ items: any[] }>(`/operator/content?kind=${kind}`),
    [editing, setEditing] = useState<any | null>(null),
    [json, setJson] = useState(""),
    [preview, setPreview] = useState<any | null>(null),
    [confirm, setConfirm] = useState<{
      id: string;
      action: "publish" | "archive";
    } | null>(null),
    action = useAction();
  const open = (row: any) => {
    setJson(JSON.stringify(row.draft, null, 2));
    setEditing(row);
  };
  return (
    <>
      <PageHeading
        eyebrow={`${me!.brand.name} / CMS`}
        title={t.content}
        body={t.contentBody}
      >
        <Button
          variant="secondary"
          busy={action.pending}
          disabled={!query.data?.items.length}
          onClick={() => {
            const source =
              query.data!.items.find(
                (row) => row.profile === me!.brand.profile,
              ) || query.data!.items[0];
            const sample = structuredClone(source.draft);
            if (sample.name && typeof sample.name === "object")
              sample.name = { en: "New service", es: "Nuevo servicio" };
            else if (typeof sample.name === "string")
              sample.name = locale === "es" ? "Nuevo bloque" : "New block";
            else if (sample.title)
              sample.title = {
                en: "New demonstration case",
                es: "Nuevo caso de demostración",
              };
            else if (sample.question)
              sample.question = { en: "New question", es: "Nueva pregunta" };
            if ("profile" in sample) sample.profile = me!.brand.profile;
            void action
              .run(
                () =>
                  request<any>("/operator/content", "POST", {
                    kind,
                    data: sample,
                  }),
                t.saved,
              )
              .then((row) => {
                if (row) open(row);
              });
          }}
        >
          <Plus size={16} />
          {t.createContent}
        </Button>
      </PageHeading>
      <div className="content-tabs" role="group" aria-label={t.content}>
        {(["service", "case", "faq", "template"] as ContentKind[]).map((k) => (
          <Button
            variant={kind === k ? "primary" : "secondary"}
            key={k}
            onClick={() =>
              router.replace(`/operator/?view=content&kind=${k}`, {
                scroll: false,
              })
            }
          >
            {t.contentKinds[k]}
          </Button>
        ))}
      </div>
      <QueryState query={query}>
        {query.data?.items.map((row) => (
          <article className="content-item" key={row.id}>
            <div>
              <h3>
                {row.draft.name?.[locale] ||
                  row.draft.name ||
                  row.draft.title?.[locale] ||
                  row.draft.question?.[locale]}
              </h3>
              <div className="actions">
                <Status value={row.status} />
                <small>
                  V{row.revision} / {(t as any)[row.profile]}
                </small>
              </div>
            </div>
            <div className="actions">
              <Button variant="secondary" onClick={() => open(row)}>
                {t.editContent}
              </Button>
              <Button
                variant="quiet"
                onClick={() =>
                  action
                    .run(() =>
                      request<any>(`/operator/content/${row.id}/preview`),
                    )
                    .then((result) => {
                      if (result) setPreview({ kind, data: result.data });
                    })
                }
              >
                {t.previewDraft}
                <ArrowUpRight size={14} />
              </Button>
              <Button
                variant="quiet"
                onClick={() => setConfirm({ id: row.id, action: "publish" })}
              >
                {t.publish}
              </Button>
              <Button
                variant="quiet"
                disabled={row.status === "archived"}
                onClick={() => setConfirm({ id: row.id, action: "archive" })}
              >
                {t.archive}
              </Button>
            </div>
          </article>
        ))}
      </QueryState>
      {editing && (
        <Modal title={t.editContent} onClose={() => setEditing(null)}>
          <p>
            <small>{t.jsonHelp}</small>
          </p>
          <ContentQuickEdit kind={kind} json={json} setJson={setJson} />
          <details>
            <summary className="text-link">{t.jsonEditor}</summary>
            <Field id="content-json" label={t.jsonEditor}>
              <textarea
                className="json-editor"
                id="content-json"
                spellCheck={false}
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
            </Field>
          </details>
          <div className="actions end">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t.cancel}
            </Button>
            <Button
              busy={action.pending}
              onClick={async () => {
                let data;
                try {
                  data = JSON.parse(json);
                } catch {
                  toast(t.invalidJson, true);
                  return;
                }
                const result = await action.run(
                  () =>
                    request(`/operator/content/${editing.id}`, "PATCH", {
                      data,
                    }),
                  t.saved,
                );
                if (result) setEditing(null);
              }}
            >
              {t.saveDraft}
            </Button>
          </div>
        </Modal>
      )}
      {preview && (
        <Modal title={t.previewDraft} onClose={() => setPreview(null)}>
          <p className="eyebrow">
            {t.private} / {t.draft}
          </p>
          <PreviewContent kind={preview.kind} data={preview.data} />
        </Modal>
      )}
      {confirm && (
        <Confirm
          title={confirm.action === "publish" ? t.publishTitle : t.archiveTitle}
          body={confirm.action === "publish" ? t.publishBody : t.archiveBody}
          busy={action.pending}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const result = await action.run(
              () =>
                request(
                  `/operator/content/${confirm.id}${confirm.action === "publish" ? "/publish" : ""}`,
                  confirm.action === "publish" ? "POST" : "DELETE",
                  confirm.action === "publish" ? {} : undefined,
                ),
              t.saved,
            );
            if (result) setConfirm(null);
          }}
        />
      )}
    </>
  );
}
