import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppUser } from '../../data/mockUser';
import { Topbar } from './Topbar';
import { Toaster, showToast } from '../ui/Toaster';
import { onForegroundMessage } from '../../lib/firebase';

const reactiveSurfaceSelector = [
  '.interactive-map-card',
  '.home-widget',
  '.weather-summary',
  '.activity-discovery-panel',
  '.activity-featured',
  '.event-feature-story',
  '.event-timeline-panel',
  '.certified-trust-panel',
  '.quick-stat-strip article',
  '.home-map-panel',
  '.data-card',
  '.liquid-card:not(.utility-strip)',
  '.auth-form',
  '.detail-page',
  '.dashboard-section',
  '.moderation-card',
  '.settings-card',
  '.onboarding-card',
].join(',');

export function AppShell({ user, children }: { user: AppUser; children: ReactNode }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  // Notifiche FCM in foreground → toast in alto a destra (sostituisce il vecchio
  // riquadro inline nel profilo).
  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      const title = payload.notification?.title || t('nav.pushNotifications');
      const body = payload.notification?.body || '';
      // Heuristic: il payload può avere data.type='event'|'activity' lato server
      const type = (payload.data?.type === 'event' || payload.data?.type === 'activity')
        ? payload.data.type as 'event' | 'activity'
        : 'info';
      showToast({ title, body, type });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const supportsFineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!supportsFineHover.matches) return undefined;

    let frame = 0;
    let activeSurface: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const updateSpotlight = () => {
      frame = 0;
      if (!activeSurface) return;

      const rect = activeSurface.getBoundingClientRect();
      const x = ((pointerX - rect.left) / rect.width) * 100;
      const y = ((pointerY - rect.top) / rect.height) * 100;

      activeSurface.style.setProperty('--spotlight-x', `${Math.max(0, Math.min(100, x)).toFixed(2)}%`);
      activeSurface.style.setProperty('--spotlight-y', `${Math.max(0, Math.min(100, y)).toFixed(2)}%`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const surface = event.target instanceof Element
        ? event.target.closest<HTMLElement>(reactiveSurfaceSelector)
        : null;

      if (!surface) return;
      activeSurface = surface;
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!frame) frame = window.requestAnimationFrame(updateSpotlight);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="app-shell">
      <Topbar user={user} />
      <main className="content-canvas">{children}</main>
      <Toaster />
      <footer className="app-footer" aria-label={t('footer.ariaLabel')}>
        <div className="app-footer-inner">
          <span>{t('footer.copyright', { year })}</span>
          <nav className="app-footer-links" aria-label={t('footer.ariaLabel')}>
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/termini">{t('footer.terms')}</Link>
            <a href="mailto:privacy@comune.trento.it">{t('footer.contact')}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
