/* ===========================================================
   Trento Live Activity — Toaster
   Toast in alto a destra per notifiche push in foreground (e
   altri messaggi). Stile glassmorphism coerente con i widget:
   stili locali nel componente, nessun CSS condiviso toccato.
   =========================================================== */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

export type ToastType = "info" | "event" | "activity" | "success" | "error";

export interface Toast {
  id: string;
  title: string;
  body?: string;
  type?: ToastType;
  /* Azione opzionale: mostra un bottone nel toast (es. "Cambia nelle
     impostazioni"). onClick può navigare o eseguire qualunque callback. */
  action?: { label: string; onClick: () => void };
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 6000;
const EVENT_SHOW = "tla:toast";
const EVENT_DISMISS = "tla:toast-dismiss";

export function showToast(toast: Omit<Toast, "id">): void {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  window.dispatchEvent(new CustomEvent<Toast>(EVENT_SHOW, { detail: { id, ...toast } }));
}

const TYPE_ACCENT: Record<ToastType, string> = {
  info: "var(--cyan)",
  event: "var(--magenta)",
  activity: "var(--teal)",
  success: "var(--green)",
  error: "var(--red)",
};

const TYPE_ICON: Record<ToastType, string> = {
  info: "bell",
  event: "calendar",
  activity: "activity",
  success: "check",
  error: "warn",
};

export function Toaster() {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onShow(e: Event) {
      const toast = (e as CustomEvent<Toast>).detail;
      setToasts((prev) => [toast, ...prev].slice(0, MAX_VISIBLE));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== toast.id));
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
    <div className="tla-toaster" aria-live="polite" aria-atomic="false">
      <style>{`
        .tla-toaster {
          position: fixed;
          top: 86px;
          right: 18px;
          z-index: 1200;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: min(360px, calc(100vw - 36px));
          pointer-events: none;
        }
        .tla-toast {
          pointer-events: auto;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 12px 13px;
          background: linear-gradient(150deg, var(--glass-1), var(--glass-2));
          border: 1px solid var(--border-soft);
          border-left: 3px solid var(--tc, var(--cyan));
          border-radius: var(--radius-lg, 16px);
          backdrop-filter: blur(var(--panel-blur, 18px)) saturate(135%);
          -webkit-backdrop-filter: blur(var(--panel-blur, 18px)) saturate(135%);
          box-shadow:
            0 18px 44px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.10);
          animation: tla-toast-in 320ms cubic-bezier(.2,.8,.3,1);
        }
        @keyframes tla-toast-in {
          from { opacity: 0; transform: translateX(16px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        .tla-toast-ic {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 9px;
          color: var(--tc, var(--cyan));
          background: color-mix(in srgb, var(--tc, var(--cyan)) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--tc, var(--cyan)) 35%, transparent);
        }
        .tla-toast-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tla-toast-title {
          font-family: var(--font);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.3;
          overflow-wrap: anywhere;
        }
        .tla-toast-body {
          font-family: var(--font);
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          overflow-wrap: anywhere;
        }
        .tla-toast-close {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          margin: -2px -3px 0 0;
          padding: 0;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease;
        }
        .tla-toast-close:hover {
          background: var(--hover-fill, rgba(255,255,255,0.08));
          color: var(--text-primary);
        }
        .tla-toast-action {
          align-self: flex-start;
          margin-top: 7px;
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--tc, var(--cyan)) 40%, transparent);
          background: color-mix(in srgb, var(--tc, var(--cyan)) 14%, transparent);
          color: var(--tc, var(--cyan));
          font-family: var(--font);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 160ms ease, border-color 160ms ease;
        }
        .tla-toast-action:hover {
          background: color-mix(in srgb, var(--tc, var(--cyan)) 24%, transparent);
          border-color: color-mix(in srgb, var(--tc, var(--cyan)) 60%, transparent);
        }
      `}</style>
      {toasts.map((toast) => {
        const type: ToastType = toast.type || "info";
        return (
          <div key={toast.id} className="tla-toast" role="alert" style={{ "--tc": TYPE_ACCENT[type] } as any}>
            <span className="tla-toast-ic"><Icon name={TYPE_ICON[type]} size={16} /></span>
            <div className="tla-toast-content">
              {toast.title && <div className="tla-toast-title">{toast.title}</div>}
              {toast.body && <div className="tla-toast-body">{toast.body}</div>}
              {toast.action && (
                <button
                  type="button"
                  className="tla-toast-action"
                  onClick={() => {
                    toast.action!.onClick();
                    window.dispatchEvent(new CustomEvent(EVENT_DISMISS, { detail: toast.id }));
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              className="tla-toast-close"
              aria-label={t("toast.closeAria")}
              onClick={() => window.dispatchEvent(new CustomEvent(EVENT_DISMISS, { detail: toast.id }))}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
