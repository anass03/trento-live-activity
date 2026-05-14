import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarCheck,
  Download,
  Home,
  Languages,
  LayoutDashboard,
  LogIn,
  MapPin,
  MessageSquareWarning,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { adminNav, entityNav, municipalityNav, primaryNav } from '../../config/navigation';
import type { AppUser } from '../../data/mockUser';

const iconMap: Record<string, LucideIcon> = {
  Mappa: Home,
  Attivita: Sparkles,
  'Attività': Sparkles,
  Eventi: CalendarDays,
  'Eventi certificati': CalendarCheck,
  Profilo: User,
  'Accedi / Registrati': LogIn,
  'Pubblica evento': PenLine,
  'Dashboard Comune': LayoutDashboard,
  Statistiche: BarChart3,
  Export: Download,
  'Gestione POI': MapPin,
  Utenti: Users,
  'Richieste enti': Building2,
  Moderazione: MessageSquareWarning,
};

const roleBadge: Record<AppUser['role'], { label: string; icon: LucideIcon }> = {
  anonymous: { label: 'Ospite', icon: LogIn },
  registered_user: { label: 'Cittadino', icon: User },
  certified_entity: { label: 'Ente', icon: ShieldCheck },
  municipal_admin: { label: 'Comune', icon: BarChart3 },
  system_admin: { label: 'Admin', icon: ShieldCheck },
};

function TopbarLink({ item, compact = false }: { item: { label: string; path: string }; compact?: boolean }) {
  const Icon = iconMap[item.label] ?? Sparkles;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => `topbar-link${compact ? ' compact' : ''}${isActive ? ' active' : ''}`}
      aria-label={item.label}
      title={item.label}
    >
      <Icon size={19} strokeWidth={2.15} aria-hidden="true" />
    </NavLink>
  );
}

export function Topbar({ user }: { user: AppUser }) {
  const navigate = useNavigate();
  const canSee = (roles: AppUser['role'][]) => roles.includes(user.role);
  const role = roleBadge[user.role];
  const RoleIcon = role.icon;

  const primaryItems = primaryNav
    .filter((item) => canSee(item.roles))
    .filter((item) => item.path !== '/profilo' && item.path !== '/login');
  const entityItems = user.role === 'certified_entity' && user.approvato ? entityNav : [];
  const municipalityItems = user.role === 'municipal_admin' ? municipalityNav : [];
  const adminItems = user.role === 'system_admin' ? adminNav : [];
  const roleItems = [...entityItems, ...municipalityItems, ...adminItems];

  return (
    <header className="topbar" aria-label="Navigazione principale">
      <div className="topbar-left">
        <button
          className="topbar-user"
          type="button"
          onClick={() => navigate(user.role === 'anonymous' ? '/login' : '/profilo')}
          aria-label={user.role === 'anonymous' ? 'Accedi o registrati' : `Profilo di ${user.name}`}
          title={user.role === 'anonymous' ? 'Accedi o registrati' : `${user.name} (${role.label})`}
        >
          <span className="topbar-avatar">
            {user.role === 'anonymous' ? <RoleIcon size={17} aria-hidden="true" /> : user.avatar}
          </span>
        </button>
      </div>

      <nav className="topbar-nav" aria-label="Sezioni">
        {primaryItems.map((item) => (
          <TopbarLink item={item} key={item.path} />
        ))}
      </nav>

      <div className="topbar-actions">
        {roleItems.map((item) => (
          <TopbarLink item={item} key={item.path} compact />
        ))}
        <button className="topbar-icon-button" type="button" aria-label="Lingua" title="Lingua">
          <Languages size={18} aria-hidden="true" />
        </button>
        <button className="topbar-icon-button" type="button" aria-label="Impostazioni" title="Impostazioni">
          <Settings size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
