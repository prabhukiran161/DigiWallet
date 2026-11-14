"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export type Save = (action: string, data: unknown) => Promise<void>;

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export function Modal({ title, children, onClose, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    d?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <dialog ref={ref} aria-labelledby={id} onCancel={onClose} className={className}>
      <header className="modal-head">
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 id={id}>{title}</h2>
        <span className="header-spacer" />
      </header>
      <div className="modal-content">{children}</div>
    </dialog>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

interface InfoNoteProps {
  label: string;
  children: ReactNode;
}

export function InfoNote({ label, children }: InfoNoteProps) {
  return (
    <details className="info-note">
      <summary>
        <Info size={14} />
        {label}
      </summary>
      <p>{children}</p>
    </details>
  );
}

interface EmptyProps {
  title: string;
  children: ReactNode;
}

export function Empty({ title, children }: EmptyProps) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BrandLogo size={54} />
      </span>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
