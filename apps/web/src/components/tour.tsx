"use client";
import { Compass, Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { Button } from "./ui";
export function DemoTour() {
  const { t } = useApp(),
    [open, setOpen] = useState(false),
    [step, setStep] = useState(0),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!open) return;
    const pause = (e: Event) => {
      if (!(e.target as HTMLElement).closest(".tour-panel")) setPaused(true);
    };
    document.addEventListener("pointerdown", pause);
    document.addEventListener("keydown", pause);
    return () => {
      document.removeEventListener("pointerdown", pause);
      document.removeEventListener("keydown", pause);
    };
  }, [open]);
  useEffect(() => {
    if (!open || paused || step === 5) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 15000);
    return () => clearTimeout(timer);
  }, [open, paused, step]);
  if (!open)
    return (
      <button
        className="tour-launch"
        aria-label={t.tour}
        onClick={() => {
          setOpen(true);
          setStep(0);
        }}
      >
        <Compass size={18} />
        <span>{t.tour}</span>
      </button>
    );
  return (
    <aside className="tour-panel" aria-label={t.tour}>
      <div className="between">
        <span className="eyebrow">
          {t.tour} / 0{step + 1}
        </span>
        <Button
          variant="quiet"
          aria-label={t.close}
          onClick={() => setOpen(false)}
        >
          <X size={17} />
        </Button>
      </div>
      <p aria-live="polite">{t.tourSteps[step]}</p>
      <div className="actions">
        <Button variant="quiet" onClick={() => setPaused(!paused)}>
          {paused ? <Play size={16} /> : <Pause size={16} />}{" "}
          {paused ? t.resume : t.tourPause}
        </Button>
        <Button
          variant="secondary"
          onClick={() => (step === 5 ? setOpen(false) : setStep(step + 1))}
        >
          {step === 5 ? t.tourFinish : t.next}
        </Button>
      </div>
    </aside>
  );
}
