import type { ReactNode } from 'react';
import type { AppUser } from '../../data/mockUser';
import { Sidebar } from './Sidebar';

export function AppShell({ user, children }: { user: AppUser; children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <main className="content-canvas">{children}</main>
    </div>
  );
}
