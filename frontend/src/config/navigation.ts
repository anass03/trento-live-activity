import type { UserRole } from '../data/mockUser';

export interface NavItem { label: string; path: string; roles: UserRole[]; }

export const primaryNav: NavItem[] = [
  { label: 'Mappa', path: '/', roles: ['anonymous', 'registered_user', 'municipal_admin', 'system_admin'] },
  { label: 'Attività', path: '/attivita', roles: ['anonymous', 'registered_user', 'municipal_admin', 'system_admin'] },
  { label: 'Eventi', path: '/eventi', roles: ['anonymous', 'registered_user', 'municipal_admin', 'system_admin'] },
  { label: 'Eventi certificati', path: '/eventi-certificati', roles: ['anonymous', 'registered_user', 'municipal_admin', 'system_admin'] },
  { label: 'Profilo', path: '/profilo', roles: ['registered_user'] },
  { label: 'Accedi / Registrati', path: '/login', roles: ['anonymous'] },
];

export const municipalityNav: NavItem[] = [
  { label: 'Dashboard Comune', path: '/comune/dashboard', roles: ['municipal_admin'] },
  { label: 'Statistiche', path: '/comune/statistiche', roles: ['municipal_admin'] },
  { label: 'Export', path: '/comune/export', roles: ['municipal_admin'] },
];

export const adminNav: NavItem[] = [
  { label: 'Gestione POI', path: '/admin/poi', roles: ['system_admin'] },
  { label: 'Utenti', path: '/admin/utenti', roles: ['system_admin'] },
  { label: 'Richieste enti', path: '/admin/enti/richieste', roles: ['system_admin'] },
  { label: 'Moderazione', path: '/admin/moderazione', roles: ['system_admin'] },
];
