import { Icon } from "../ui/Icon";

export function Header({ page, setPage, theme, setTheme }: any) {
  const nav = [
    { id: "home", label: "Home", icon: "home" },
    { id: "eventi", label: "Eventi", icon: "calendar" },
    { id: "attivita", label: "Attività", icon: "activity" },
    { id: "impostazioni", label: "Impostazioni", icon: "settings" },
  ];

  return (
    <div className="header">
      <div className="brand">
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
        <button className="icon-btn"><Icon name="bell" size={18} /><span className="badge"></span></button>
        <button className="theme-toggle" onClick={() => setTheme(theme === "day" ? "night" : "day")} aria-label="Cambia tema" title="Giorno / Notte">
          <span className="tt-thumb"></span>
          <span className={"tt-ic" + (theme === "night" ? " on" : "")}><Icon name="moon" size={15} /></span>
          <span className={"tt-ic" + (theme === "day" ? " on" : "")}><Icon name="sun" size={15} /></span>
        </button>
        <div className="avatar">MR</div>
      </div>
    </div>
  );
}
