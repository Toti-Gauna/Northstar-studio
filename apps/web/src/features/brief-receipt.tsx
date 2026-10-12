"use client";
import { ArrowRight } from "lucide-react";
import { Button, LinkButton } from "../components/ui";
import type { BriefFlow } from "./use-brief-flow";
import { useEffect, useRef } from "react";
export function BriefReceipt({ flow }: { flow: BriefFlow }) {
  const { t, switchRole, action, receipt } = flow;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  if (!receipt) return null;
  return (
    <section className="wrap">
      <div className="panel confirmation">
        <span className="star" aria-hidden="true">
          ✦
        </span>
        <p className="eyebrow">
          {t.request} / {t.received}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {t.received}
        </h1>
        <p>{t.receivedBody}</p>
        <div className="confirmation-reference">
          <strong>{receipt.reference}</strong>
          <small>
            {t.leadId}: {receipt.id}
          </small>
        </div>
        <div className="actions">
          <LinkButton href={`/client/?view=request&id=${receipt.id}`}>
            {t.openRequest}
          </LinkButton>
          <Button
            variant="secondary"
            busy={action.pending}
            onClick={async () => {
              const result = await action.run(async () => {
                await switchRole("operator");
                return true;
              });
              if (!result) return;
              window.location.assign(
                `/operator/?view=request&id=${receipt.id}`,
              );
            }}
          >
            {t.operator}
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}
