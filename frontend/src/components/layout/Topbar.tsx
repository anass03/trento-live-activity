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
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminNav, entityNav, municipalityNav, primaryNav } from '../../config/navigation';
import type { AppUser } from '../../data/mockUser';
import { getStoredTheme, toggleTheme, type Theme } from '../../lib/theme';
import { setLanguage } from '../../lib/i18n';
import i18next from 'i18next';

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

// Mappa label-IT → chiave i18n (per i tooltip nella topbar).
const labelToKey: Record<string, string> = {
  Mappa: 'nav.map',
  'Attività': 'nav.activities',
  Eventi: 'nav.events',
  'Eventi certificati': 'nav.certifiedEvents',
  Profilo: 'nav.profile',
  'Accedi / Registrati': 'nav.login',
};

const roleBadge: Record<AppUser['role'], { label: string; icon: LucideIcon }> = {
  anonymous: { label: 'Ospite', icon: LogIn },
  registered_user: { label: 'Cittadino', icon: User },
  certified_entity: { label: 'Ente', icon: ShieldCheck },
  municipal_admin: { label: 'Comune', icon: BarChart3 },
  system_admin: { label: 'Admin', icon: ShieldCheck },
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
  const navigate = useNavigate();
  const canSee = (roles: AppUser['role'][]) => roles.includes(user.role);
  const role = roleBadge[user.role];
  const RoleIcon = role.icon;
  const [theme, setThemeStateLocal] = useState<Theme>(() => getStoredTheme());
  const [lang, setLang] = useState<'it' | 'en'>(() => (i18next.language?.startsWith('en') ? 'en' : 'it'));

  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<Theme>).detail;
      if (detail) setThemeStateLocal(detail);
    };
    window.addEventListener('tla:theme-changed', onThemeChange);
    const onLangChange = (l: string) => setLang(l.startsWith('en') ? 'en' : 'it');
    i18next.on('languageChanged', onLangChange);
    return () => {
      window.removeEventListener('tla:theme-changed', onThemeChange);
      i18next.off('languageChanged', onLangChange);
    };
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
        <button
          className="topbar-lang-toggle topbar-icon-button"
          type="button"
          aria-label={lang === 'it' ? 'Switch to English' : 'Passa all\'italiano'}
          title={lang === 'it' ? 'Switch to English' : 'Passa all\'italiano'}
          onClick={() => setLanguage(lang === 'it' ? 'en' : 'it')}
        >
          <span className="topbar-lang-chip">{lang === 'it' ? 'EN' : 'IT'}</span>
        </button>
        <button
          className="topbar-icon-button"
          type="button"
          aria-label={theme === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
          title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
          onClick={() => setThemeStateLocal(toggleTheme())}
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        <button
          className="topbar-icon-button"
          type="button"
          aria-label="Impostazioni"
          title="Impostazioni"
          onClick={() => navigate('/impostazioni')}
        >
          <Settings size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
