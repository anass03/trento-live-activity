import { useEffect, useRef, useState } from "react";
import { logout as apiLogout } from "../../lib/api";
import { Icon } from "../ui/Icon";

export function Header({ page, setPage, theme, setTheme, user }: any) {
  const role = user?.role || "anonymous";
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const close = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [profileOpen]);

  const go = (id: string) => {
    setProfileOpen(false);
    setPage(id);
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await apiLogout();
    setPage("login");
  };

  let nav = [
    { id: "home", label: "Home", icon: "home" },
    { id: "eventi", label: "Eventi", icon: "calendar" },
    { id: "attivita", label: "Attività", icon: "activity" },
    { id: "impostazioni", label: "Impostazioni", icon: "settings" },
  ];

  if (role === "municipal_admin") {
    nav = [
      { id: "home", label: "Mappa", icon: "home" },
      { id: "comune-dashboard", label: "Pannello Comune", icon: "grid" },
      { id: "comune-statistiche", label: "Statistiche", icon: "trending" },
      { id: "comune-export", label: "Export", icon: "share" },
      { id: "impostazioni", label: "Impostazioni", icon: "settings" },
    ];
  } else if (role === "system_admin") {
    nav = [
      { id: "home", label: "Mappa", icon: "home" },
      { id: "admin-users", label: "Utenti", icon: "users" },
      { id: "admin-poi", label: "POI", icon: "pin" },
      { id: "admin-enti-richieste", label: "Enti", icon: "shieldCheck" },
      { id: "admin-moderazione", label: "Moderazione", icon: "warn" },
      { id: "admin-notifications", label: "Notifiche", icon: "bell" },
      { id: "impostazioni", label: "Impostazioni", icon: "settings" },
    ];
  } else if (role === "certified_entity") {
    nav = [
      { id: "home", label: "Mappa", icon: "home" },
      { id: "eventi", label: "Eventi", icon: "calendar" },
      { id: "ente-pubblica", label: "Pubblica", icon: "sparkle" },
      { id: "impostazioni", label: "Impostazioni", icon: "settings" },
    ];
  }

  return (
    <div className="header">
      <div className="brand" style={{ cursor: "pointer" }} onClick={() => setPage("home")}>
        <div className="brand-logo">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 21V11l4-3 4 3v10" stroke="#7dd3fc" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M13 21V8l3-2 3 2v13" stroke="#a78bfa" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M3 21h18" stroke="#7dd3fc" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="16" cy="9.5" r="1" fill="#f472b6" />
            <path d="M9 21v-4h0" stroke="#7dd3fc" strokeWidth="1.7" />
          </svg>
        </div>
        <div>
          <div className="brand-name">Trento <span className="live">Live</span> Activity</div>
          <div className="brand-sub">Smart City · Tempo reale</div>
        </div>
      </div>

      <div className="nav">
        {nav.map((n) => (
          <button key={n.id} className={"nav-item" + (page === n.id ? " active" : "")} onClick={() => setPage(n.id)}>
            <Icon name={n.icon} size={17} />{n.label}
          </button>
        ))}
      </div>

      <div className="header-right">
        <div className="search-bar">
          <Icon name="search" size={16} style={{ opacity: 0.6 }} />
          <input placeholder="Cerca luoghi, eventi…" />
          <kbd>⌘K</kbd>
        </div>
        <button className="icon-btn" onClick={() => setPage(role === "system_admin" ? "admin-notifications" : "home")}><Icon name="bell" size={18} /><span className="badge"></span></button>
        <button className="theme-toggle" onClick={() => setTheme(theme === "day" ? "night" : "day")} aria-label="Cambia tema" title="Giorno / Notte">
          <span className="tt-thumb"></span>
          <span className={"tt-ic" + (theme === "night" ? " on" : "")}><Icon name="moon" size={15} /></span>
          <span className={"tt-ic" + (theme === "day" ? " on" : "")}><Icon name="sun" size={15} /></span>
        </button>
        <div className="profile-menu-wrap" ref={profileRef}>
          <button className="avatar avatar-btn" onClick={() => setProfileOpen((v) => !v)} aria-label="Profilo" aria-expanded={profileOpen}>
            {user?.avatar || "O"}
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <div className="profile-menu-head">
                <div className="profile-menu-av">{user?.avatar || "O"}</div>
                <div>
                  <div className="profile-menu-name">{user?.name || "Ospite"}</div>
                  <div className="profile-menu-email">{role === "anonymous" ? "Accesso ospite" : user?.email}</div>
                </div>
              </div>
              {role === "anonymous" ? (
                <button className="profile-menu-item primary" onClick={() => go("login")}><Icon name="logIn" size={15} />Accedi</button>
              ) : (
                <>
                  <button className="profile-menu-item" onClick={() => go("profilo")}><Icon name="user" size={15} />Profilo</button>
                  <button className="profile-menu-item" onClick={() => go("attivita")}><Icon name="activity" size={15} />Le mie attivita</button>
                  <button className="profile-menu-item" onClick={() => go("profilo")}><Icon name="bookmark" size={15} />Salvati</button>
                  <button className="profile-menu-item" onClick={() => go("impostazioni")}><Icon name="settings" size={15} />Impostazioni</button>
                  <button className="profile-menu-item danger" onClick={handleLogout}><Icon name="logOut" size={15} />Logout</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
