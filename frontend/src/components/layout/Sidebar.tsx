import { NavLink, useNavigate } from 'react-router-dom';
import { adminNav, entityNav, municipalityNav, primaryNav } from '../../config/navigation';
import type { AppUser } from '../../data/mockUser';

const roleLabels: Record<AppUser['role'], string> = {
  anonymous: 'Utente anonimo',
  registered_user: 'Utente registrato',
  certified_entity: 'Ente certificato',
  municipal_admin: 'Amministratore comunale (sola lettura)',
  system_admin: 'Amministratore di sistema',
};

export function Sidebar({ user }: { user: AppUser }) {
  const navigate = useNavigate();
  const canSee = (roles: AppUser['role'][]) => roles.includes(user.role);

  return (
    <aside className="sidebar glass-panel">
      <button className="profile-block glass-card" onClick={() => navigate(user.role === 'anonymous' ? '/login' : '/profilo')}>
        <span className="avatar">{user.avatar}</span>
        <div>
          <strong>{user.role === 'anonymous' ? 'Accedi / Registrati' : user.name}</strong>
          <p>{roleLabels[user.role]}</p>
        </div>
      </button>

      <nav className="nav-group">
        {primaryNav.filter((n) => canSee(n.roles)).map((item) => (
          <NavLink key={item.path} to={item.path} className="glass-nav-item">{item.label}</NavLink>
        ))}
      </nav>

      {user.role === 'certified_entity' && user.approvato && (
        <nav className="nav-group">
          <p className="nav-title">Ente certificato</p>
          {entityNav.map((item) => <NavLink key={item.path} to={item.path} className="glass-nav-item">{item.label}</NavLink>)}
        </nav>
      )}

      {user.role === 'municipal_admin' && (
        <nav className="nav-group">
          <p className="nav-title">Comune (sola lettura)</p>
          {municipalityNav.map((item) => <NavLink key={item.path} to={item.path} className="glass-nav-item">{item.label}</NavLink>)}
        </nav>
      )}

      {user.role === 'system_admin' && (
        <nav className="nav-group">
          <p className="nav-title">Admin tools</p>
          {adminNav.map((item) => <NavLink key={item.path} to={item.path} className="glass-nav-item">{item.label}</NavLink>)}
        </nav>
      )}

      <div className="sidebar-footer glass-card">
        <button>Lingua: IT / EN</button>
        <button>Impostazioni</button>
      </div>
    </aside>
  );
}
