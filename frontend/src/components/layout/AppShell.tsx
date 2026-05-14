import type { ReactNode } from 'react';
import type { AppUser } from '../../data/mockUser';
import { Topbar } from './Topbar';

export function AppShell({ user, children }: { user: AppUser; children: ReactNode }) {
  return (
    <div className="app-shell">
      <Topbar user={user} />
      <main className="content-canvas">{children}</main>
    </div>
  );
}
