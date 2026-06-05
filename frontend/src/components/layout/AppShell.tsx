import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppUser } from '../../data/mockUser';
import { Topbar } from './Topbar';
import { Toaster, showToast } from '../ui/Toaster';
import { onForegroundMessage } from '../../lib/firebase';

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
