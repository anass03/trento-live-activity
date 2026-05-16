import { useEffect, useState } from 'react';

export type ToastType = 'info' | 'event' | 'activity' | 'success' | 'error';

export interface Toast {
  id: string;
  title: string;
  body?: string;
  type?: ToastType;
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 5000;
const EVENT_SHOW = 'tla:toast';
const EVENT_DISMISS = 'tla:toast-dismiss';

export function showToast(toast: Omit<Toast, 'id'>): void {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  window.dispatchEvent(new CustomEvent<Toast>(EVENT_SHOW, { detail: { id, ...toast } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onShow(e: Event) {
      const t = (e as CustomEvent<Toast>).detail;
      setToasts((prev) => [t, ...prev].slice(0, MAX_VISIBLE));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, AUTO_DISMISS_MS);
    }
    function onDismiss(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }
    window.addEventListener(EVENT_SHOW, onShow);
    window.addEventListener(EVENT_DISMISS, onDismiss);
    return () => {
      window.removeEventListener(EVENT_SHOW, onShow);
      window.removeEventListener(EVENT_DISMISS, onDismiss);
    };
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type || 'info'}`} role="alert">
          <div className="toast-content">
            {t.title && <strong>{t.title}</strong>}
            {t.body && <span>{t.body}</span>}
          </div>
          <button
            type="button"
            className="toast-close"
            aria-label="Chiudi notifica"
            onClick={() => window.dispatchEvent(new CustomEvent(EVENT_DISMISS, { detail: t.id }))}
          >×</button>
        </div>
      ))}
    </div>
  );
}
