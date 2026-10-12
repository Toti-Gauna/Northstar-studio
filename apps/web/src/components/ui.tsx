"use client";
import { ArrowUpRight, Check, LoaderCircle, X } from "lucide-react";
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useApp } from "./providers";
export function Button({
  children,
  variant = "primary",
  busy = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      className={`button ${variant} ${props.className || ""}`}
      disabled={props.disabled || busy}
      aria-busy={busy}
    >
      {busy && <LoaderCircle className="spin" size={16} />} {children}
    </button>
  );
}
export function LinkButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <a className={`button ${secondary ? "secondary" : "primary"}`} href={href}>
      {children}
      <ArrowUpRight size={17} />
    </a>
  );
}
export function Field({
  label,
  error,
  children,
  hint,
  id,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
  id: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small className="field-error" id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  const { t } = useApp();
  return (
    <span className={`status ${value}`}>
      <span aria-hidden="true" />
      {(t as any)[value] || value}
    </span>
  );
}
export function Loading() {
  const { t } = useApp();
  return (
    <div className="empty" role="status">
      <LoaderCircle size={24} />
      <p>{t.loading}</p>
    </div>
  );
}
export function QueryState({
  query,
  children,
}: {
  query: { isPending: boolean; isError: boolean; refetch: () => unknown };
  children: ReactNode;
}) {
  const { t } = useApp();
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <div className="empty" role="alert">
        <p>{t.error}</p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          {t.retry}
        </Button>
      </div>
    );
  return children;
}
export function Empty({
  text,
  children,
}: {
  text?: string;
  children?: ReactNode;
}) {
  const { t } = useApp();
  return (
    <div className="empty">
      <span className="star" aria-hidden="true">
        ✦
      </span>
      <p>{text || t.empty}</p>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { t } = useApp(),
    ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const node = ref.current!;
    node.showModal();
    return () => {
      node.close();
      if (previous?.isConnected) previous.focus();
      else {
        const heading = document.querySelector("main h1") as HTMLElement | null;
        heading?.setAttribute("tabindex", "-1");
        heading?.focus();
      }
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-heading"
    >
      <div className="modal-head">
        <h2 id="modal-heading">{title}</h2>
        <Button variant="quiet" onClick={onClose} aria-label={t.close}>
          <X size={18} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  body,
  onClose,
  onConfirm,
  busy,
}: {
  title: string;
  body: string;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const { t } = useApp();
  return (
    <Modal title={title} onClose={onClose}>
      <p>{body}</p>
      <div className="actions end">
        <Button variant="secondary" onClick={onClose}>
          {t.cancel}
        </Button>
        <Button busy={busy} onClick={onConfirm}>
          <Check size={16} />
          {t.confirm}
        </Button>
      </div>
    </Modal>
  );
}
export function PageHeading({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {body && <p className="lede">{body}</p>}
      </div>
      {children}
    </div>
  );
}
