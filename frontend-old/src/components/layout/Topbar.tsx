import { useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarCheck,
  Download,
  Home,
  LayoutDashboard,
  LogIn,
  MapPin,
  MessageSquareWarning,
  Moon,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminNav, entityNav, municipalityNav, primaryNav } from '../../config/navigation';
import type { AppUser } from '../../data/mockUser';
import { getStoredTheme, toggleTheme, type Theme } from '../../lib/theme';

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

// Maps Italian nav labels to i18n keys (tooltips in the topbar).
const labelToKey: Record<string, string> = {
  Mappa: 'nav.map',
  'Attività': 'nav.activities',
  Eventi: 'nav.events',
  'Eventi certificati': 'nav.certifiedEvents',
  Profilo: 'nav.profile',
  'Accedi / Registrati': 'nav.login',
  'Pubblica evento': 'nav.publishEvent',
  'Dashboard Comune': 'nav.municipalDashboard',
  Statistiche: 'nav.statistics',
  Export: 'nav.export',
  'Gestione POI': 'nav.managePOI',
  Utenti: 'nav.users',
  'Richieste enti': 'nav.entityRequests',
  Moderazione: 'nav.moderation',
  'Notifiche push': 'nav.pushNotifications',
};

const roleKey: Record<AppUser['role'], { i18nKey: string; icon: LucideIcon }> = {
  anonymous: { i18nKey: 'nav.guestRole', icon: LogIn },
  registered_user: { i18nKey: 'nav.citizenRole', icon: User },
  certified_entity: { i18nKey: 'nav.entityRole', icon: ShieldCheck },
  municipal_admin: { i18nKey: 'nav.municipalRole', icon: BarChart3 },
  system_admin: { i18nKey: 'nav.adminRole', icon: ShieldCheck },
};

function TopbarLink({ item, compact = false }: { item: { label: string; path: string }; compact?: boolean }) {
  const { t } = useTranslation();
  const Icon = iconMap[item.label] ?? Sparkles;
  const key = labelToKey[item.label];
  const localized = key ? t(key) : item.label;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => `topbar-link${compact ? ' compact' : ''}${isActive ? ' active' : ''}`}
      aria-label={localized}
      title={localized}
    >
      <Icon size={19} strokeWidth={2.15} aria-hidden="true" />
    </NavLink>
  );
}

export function Topbar({ user }: { user: AppUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canSee = (roles: AppUser['role'][]) => roles.includes(user.role);
  const role = roleKey[user.role];
  const RoleIcon = role.icon;
  const roleLabel = t(role.i18nKey);
  const [theme, setThemeStateLocal] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<Theme>).detail;
      if (detail) setThemeStateLocal(detail);
    };
    window.addEventListener('tla:theme-changed', onThemeChange);
    return () => window.removeEventListener('tla:theme-changed', onThemeChange);
  }, []);

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
        <Link className="topbar-brand" to="/" aria-label="Trento Live Activity">
          <span className="topbar-brand-mark" aria-hidden="true" />
          <span className="topbar-brand-text">Trento Live Activity</span>
        </Link>
        <button
          className="topbar-user"
          type="button"
          onClick={() => navigate(user.role === 'anonymous' ? '/login' : '/profilo')}
          aria-label={user.role === 'anonymous' ? t('nav.loginOrRegister') : t('nav.userProfile', { name: user.name })}
          title={user.role === 'anonymous' ? t('nav.loginOrRegister') : `${user.name} (${roleLabel})`}
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
        <button
          className="topbar-icon-button"
          type="button"
          aria-label={theme === 'dark' ? t('nav.activateLightTheme') : t('nav.activateDarkTheme')}
          title={theme === 'dark' ? t('nav.lightTheme') : t('nav.darkTheme')}
          onClick={() => setThemeStateLocal(toggleTheme())}
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        <button
          className="topbar-icon-button"
          type="button"
          aria-label={t('nav.settings')}
          title={t('nav.settings')}
          onClick={() => navigate('/impostazioni')}
        >
          <Settings size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
