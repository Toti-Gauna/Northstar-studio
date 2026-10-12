"use client";
import { FileText } from "lucide-react";
import { Button, Field } from "../components/ui";
import { download } from "../lib/api";
import type { BriefFlow } from "./use-brief-flow";
export function BriefDocuments({ flow }: { flow: BriefFlow }) {
  const { t, action, values, files, attach } = flow;
  const { setValue } = flow.form;
  return (
    <div className="full">
      <h4>{t.documents}</h4>
      <p>
        <small>{t.fileHelp}</small>
      </p>
      <Field id="attachment" label={t.upload}>
        <input
          id="attachment"
          type="file"
          accept=".txt,.pdf,.png"
          disabled={action.pending || values.attachmentIds.length >= 5}
          onChange={(e) => {
            if (e.target.files?.[0]) void attach(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </Field>
      <Button
        type="button"
        variant="quiet"
        busy={action.pending}
        disabled={values.attachmentIds.length >= 5}
        onClick={() =>
          attach(
            new File(
              [
                "Northstar synthetic reference.\nGoal: a clear service scope.\nNo real personal information.",
              ],
              "synthetic-brief.txt",
              { type: "text/plain" },
            ),
          )
        }
      >
        <FileText size={16} />
        {t.synthetic}
      </Button>
      <ul className="document-list">
        {values.attachmentIds.map((id) => (
          <li key={id}>
            <div>
              {files.find((f) => f.id === id)?.filename || id.slice(0, 8)}
            </div>
            <div className="actions">
              <Button
                type="button"
                variant="quiet"
                onClick={() =>
                  action.run(() =>
                    download(`/attachments/${id}/download`, "reference.txt"),
                  )
                }
              >
                {t.download}
              </Button>
              <Button
                type="button"
                variant="quiet"
                onClick={() => {
                  setValue(
                    "attachmentIds",
                    values.attachmentIds.filter((x) => x !== id),
                  );
                }}
              >
                {t.remove}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
