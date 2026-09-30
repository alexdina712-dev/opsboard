import { useEffect, useRef } from 'react';
import { X, LoaderCircle, Inbox, AlertCircle } from 'lucide-react';
import { initials, labels } from '../lib/format';
export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span title={name} className={`avatar ${small ? 'small' : ''} color-${name.charCodeAt(0) % 4}`}>
      {initials(name)}
    </span>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase()}`}>
      <i />
      {labels[value] || value}
    </span>
  );
}
export function Loading() {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={24} />
      <p>Loading your workspace…</p>
    </div>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state">
      <span className="empty-icon">
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error">
      <AlertCircle size={17} />
      {message}
    </div>
  ) : null;
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>('input, button, select, textarea')?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, a[href]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
