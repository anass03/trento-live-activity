import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { logout as apiLogout } from "../../lib/api";
import { Icon } from "../ui/Icon";

export function Header({ page, setPage, theme, setTheme, user }: any) {
  const { t } = useTranslation();
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
    // Refresh the shared user state (token is gone → guest) and land on home:
    // logging back in is an explicit user choice, not a forced redirect.
    window.dispatchEvent(new Event("tla:user-updated"));
    setPage("home");
  };

  let nav = [
    { id: "home", label: t("header.nav.home"), icon: "home" },
    { id: "eventi", label: t("header.nav.events"), icon: "calendar" },
    { id: "attivita", label: t("header.nav.activities"), icon: "activity" },
    { id: "impostazioni", label: t("header.nav.settings"), icon: "settings" },
  ];

  if (role === "municipal_admin") {
    nav = [
      { id: "home", label: t("header.nav.map"), icon: "home" },
      { id: "comune-dashboard", label: t("header.nav.comuneDashboard"), icon: "grid" },
      { id: "comune-statistiche", label: t("header.nav.stats"), icon: "trending" },
      { id: "comune-export", label: t("header.nav.export"), icon: "share" },
      { id: "impostazioni", label: t("header.nav.settings"), icon: "settings" },
    ];
  } else if (role === "system_admin") {
    nav = [
      { id: "home", label: t("header.nav.map"), icon: "home" },
      { id: "admin-users", label: t("header.nav.users"), icon: "users" },
      { id: "admin-poi", label: t("header.nav.poi"), icon: "pin" },
      { id: "admin-enti-richieste", label: t("header.nav.entities"), icon: "shieldCheck" },
      { id: "admin-moderazione", label: t("header.nav.moderation"), icon: "warn" },
      { id: "admin-notifications", label: t("header.nav.notifications"), icon: "bell" },
      { id: "impostazioni", label: t("header.nav.settings"), icon: "settings" },
    ];
  } else if (role === "certified_entity") {
    nav = [
      { id: "home", label: t("header.nav.map"), icon: "home" },
      { id: "eventi", label: t("header.nav.events"), icon: "calendar" },
      { id: "ente-pubblica", label: t("header.nav.publish"), icon: "sparkle" },
      { id: "impostazioni", label: t("header.nav.settings"), icon: "settings" },
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
          <div className="brand-sub">{t("header.brandSub")}</div>
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
          <input placeholder={t("header.searchPlaceholder")} />
          <kbd>⌘K</kbd>
        </div>
        <button className="icon-btn" aria-label={t("header.notificationsAria")} onClick={() => setPage(role === "system_admin" ? "admin-notifications" : "home")}><Icon name="bell" size={18} /><span className="badge"></span></button>
        <button className="theme-toggle" onClick={() => setTheme(theme === "day" ? "night" : "day")} aria-label={t("header.themeToggleAria")} title={t("header.themeToggleTitle")}>
          <span className="tt-thumb"></span>
          <span className={"tt-ic" + (theme === "night" ? " on" : "")}><Icon name="moon" size={15} /></span>
          <span className={"tt-ic" + (theme === "day" ? " on" : "")}><Icon name="sun" size={15} /></span>
        </button>
        <div className="profile-menu-wrap" ref={profileRef}>
          <button className="avatar avatar-btn" onClick={() => setProfileOpen((v) => !v)} aria-label={t("header.profileAria")} aria-expanded={profileOpen}>
            {role === "anonymous" ? <Icon name="user" size={17} /> : (user?.avatar || "O")}
          </button>
          {profileOpen && (
            <div className="profile-menu">
              {role === "anonymous" ? (
                <>
                  <div className="profile-menu-head">
                    <div className="profile-menu-av guest"><Icon name="user" size={17} /></div>
                    <div>
                      <div className="profile-menu-name">{t("header.guestTitle")}</div>
                      <div className="profile-menu-email">{t("header.guestSubtitle")}</div>
                    </div>
                  </div>
                  <button className="profile-menu-item primary" onClick={() => go("login")}><Icon name="logIn" size={15} />{t("header.login")}</button>
                  <button className="profile-menu-item" onClick={() => go("registrazione")}><Icon name="user" size={15} />{t("header.register")}</button>
                </>
              ) : (
                <>
                  <div className="profile-menu-head">
                    <div className="profile-menu-av">{user?.avatar || "O"}</div>
                    <div>
                      <div className="profile-menu-name">{user?.name || t("header.guest")}</div>
                      <div className="profile-menu-email">{user?.email}</div>
                    </div>
                  </div>
                  <button className="profile-menu-item" onClick={() => go("profilo")}><Icon name="user" size={15} />{t("header.profile")}</button>
                  <button className="profile-menu-item" onClick={() => go("attivita")}><Icon name="activity" size={15} />{t("header.myActivities")}</button>
                  <button className="profile-menu-item" onClick={() => go("profilo")}><Icon name="bookmark" size={15} />{t("header.saved")}</button>
                  <button className="profile-menu-item" onClick={() => go("impostazioni")}><Icon name="settings" size={15} />{t("header.settings")}</button>
                  <button className="profile-menu-item danger" onClick={handleLogout}><Icon name="logOut" size={15} />{t("header.logout")}</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
