"use client";
import { ArrowRight, Check } from "lucide-react";
import { SessionGate, SiteFrame } from "../components/layout";
import {
  Button,
  Confirm,
  Empty,
  PageHeading,
  QueryState,
} from "../components/ui";
import { BriefContextStep } from "./brief-context-step";
import { BriefEstimate } from "./brief-estimate";
import { BriefReceipt } from "./brief-receipt";
import { BriefReviewStep } from "./brief-review-step";
import { BriefScopeStep } from "./brief-scope-step";
import { useBriefFlow } from "./use-brief-flow";
export function BriefPage() {
  return (
    <SiteFrame>
      <SessionGate role="customer">
        <BriefForm />
      </SessionGate>
    </SiteFrame>
  );
}
function BriefForm() {
  const flow = useBriefFlow(),
    {
      t,
      services,
      draft,
      action,
      loaded,
      step,
      direction,
      saved,
      pendingService,
      stepRef,
      estimate,
      pkg,
      service,
      changeService,
      advance,
      submit,
      setStep,
      setDirection,
      setPendingService,
    } = flow;
  if (services.data?.items.length === 0)
    return (
      <section className="wrap brief-wrap">
        <Empty text={t.noPublished} />
      </section>
    );
  if (flow.receipt) return <BriefReceipt flow={flow} />;
  return (
    <section className="brief-wrap wrap">
      <PageHeading
        eyebrow={`${flow.me!.brand.name} / ${t.brief}`}
        title={t.briefTitle}
        body={t.briefBody}
      />
      <QueryState query={services}>
        <QueryState query={draft}>
          <div className="brief-layout">
            <div>
              <ol className="stepper">
                {t.steps.map((s, i) => (
                  <li
                    key={s}
                    className={i === step ? "current" : ""}
                    aria-current={i === step ? "step" : undefined}
                  >
                    <span>
                      {i < step ? (
                        <Check size={12} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (step < 2) void advance();
                  else void submit();
                }}
                noValidate
              >
                <div key={step} className={`panel brief-step ${direction}`}>
                  <h2 ref={stepRef} tabIndex={-1}>
                    {t.steps[step]}
                  </h2>
                  <span className="sr-only" role="status" aria-live="polite">
                    {t.steps[step]} {step + 1} / 3
                  </span>
                  {step === 0 ? (
                    <BriefScopeStep flow={flow} />
                  ) : step === 1 ? (
                    <BriefContextStep flow={flow} />
                  ) : (
                    <BriefReviewStep flow={flow} />
                  )}
                </div>
                <div className="brief-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={step === 0 || action.pending}
                    onClick={() => {
                      setDirection("backward");
                      setStep(step - 1);
                    }}
                  >
                    {t.back}
                  </Button>
                  <Button
                    type="submit"
                    busy={action.pending}
                    disabled={
                      !service ||
                      !pkg ||
                      estimate.isFetching ||
                      estimate.isError
                    }
                  >
                    {step === 2 ? t.submit : t.next}
                    <ArrowRight size={16} />
                  </Button>
                </div>
                <p className="draft-note" role="status">
                  {saved ? t.draftSaved : loaded ? t.draftSaving : ""}
                </p>
              </form>
            </div>
            <BriefEstimate flow={flow} />
          </div>
        </QueryState>
      </QueryState>
      {pendingService && (
        <Confirm
          title={t.discardTitle}
          body={t.discardBody}
          onClose={() => setPendingService(null)}
          onConfirm={() => changeService(pendingService)}
        />
      )}
    </section>
  );
}
