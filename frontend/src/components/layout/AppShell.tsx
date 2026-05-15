import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AppUser } from '../../data/mockUser';
import { Topbar } from './Topbar';

export function AppShell({ user, children }: { user: AppUser; children: ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="app-shell">
      <Topbar user={user} />
      <main className="content-canvas">{children}</main>
      <footer className="app-footer" aria-label="Piè di pagina">
        <div className="app-footer-inner">
          <span>© {year} Trento Live Activity — Comune di Trento. Tutti i diritti riservati.</span>
          <nav className="app-footer-links" aria-label="Link legali">
            <Link to="/privacy">Privacy</Link>
            <Link to="/termini">Termini di servizio</Link>
            <a href="mailto:privacy@comune.trento.it">Contatti</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
