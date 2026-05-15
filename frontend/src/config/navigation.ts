import type { UserRole } from '../data/mockUser';

export interface NavItem { label: string; path: string; roles: UserRole[]; }

const ALL_ROLES: UserRole[] = ['anonymous', 'registered_user', 'certified_entity', 'municipal_admin', 'system_admin'];

export const primaryNav: NavItem[] = [
  { label: 'Mappa', path: '/', roles: ALL_ROLES },
  { label: 'Attività', path: '/attivita', roles: ALL_ROLES },
  { label: 'Eventi', path: '/eventi', roles: ALL_ROLES },
  { label: 'Profilo', path: '/profilo', roles: ['registered_user', 'certified_entity', 'municipal_admin', 'system_admin'] },
  { label: 'Accedi / Registrati', path: '/login', roles: ['anonymous'] },
];

export const entityNav: NavItem[] = [
  { label: 'Pubblica evento', path: '/ente/pubblica', roles: ['certified_entity'] },
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
