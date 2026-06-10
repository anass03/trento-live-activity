/* ===========================================================
   Trento Live Activity — IMPOSTAZIONI page
   =========================================================== */
import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";


/* ===================== CARD SHELL ===================== */
function SetCard({ num, title, desc, icon, color, children, full }: any) {
  return (
    <div className={"s-card anim-in" + (full ? " s-full" : "")} style={{ "--sc": color || "var(--accent)", animationDelay: (num * 60) + "ms" }}>
      <div className="s-card-head">
        <span className="s-card-ic"><Icon name={icon} size={19} /></span>
        <div className="s-num-title">
          <div className="s-num">{String(num).padStart(2, "0")}</div>
          <div className="s-title">{title}</div>
          <div className="s-desc">{desc}</div>
        </div>
      </div>
      <div className="s-card-body">{children}</div>
    </div>
  );
}

/* ===================== TOGGLE ===================== */
function SetToggle({ on, onChange }: any) {
  return <button className={"s-toggle" + (on ? " on" : "")} onClick={() => onChange(!on)} role="switch" aria-checked={on}></button>;
}

/* ===================== TOGGLE ROW ===================== */
function SetRow({ label, sub, on, onChange }: any) {
  const id = "st-" + label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="s-row">
      <div>
        <div className="s-row-label" id={id}>{label}</div>
        {sub && <div className="s-row-sub">{sub}</div>}
      </div>
      <SetToggle on={on} onChange={onChange} />
    </div>
  );
}

/* ===================== RADIO PILLS ===================== */
function SetRadio({ options, value, onChange }: any) {
  return (
    <div className="s-radio">
      {options.map((o) => (
        <button key={o.id} className={"s-rpill" + (value === o.id ? " on" : "")} onClick={() => onChange(o.id)}>
          {o.icon && <Icon name={o.icon} size={14} />}{o.label}
        </button>
      ))}
    </div>
  );
}

/* ===================== THEME CARDS ===================== */
function SetTheme({ value, onChange }: any) {
  const opts = [
    { id: "light", label: "Chiaro",    cls: "tc-light" },
    { id: "dark",  label: "Scuro",     cls: "tc-dark"  },
    { id: "auto",  label: "Automatico",cls: "tc-auto"  },
  ];
  return (
    <div className="s-theme-cards">
      {opts.map((o) => (
        <button key={o.id} className={"s-theme-card " + o.cls + (value === o.id ? " on" : "")} onClick={() => onChange(o.id)}>
          <div className="tc-check"><Icon name="check" size={11} /></div>
          <div className="tc-preview"><div className="tc-panel"></div><div className="tc-panel"></div></div>
          <div className="tc-label">{o.label}</div>
        </button>
      ))}
    </div>
  );
}

/* ===================== INTEREST CHIPS ===================== */
const SET_INTERESTS = [
  { id: "musica",   label: "Musica",      icon: "music",    color: "var(--magenta)" },
  { id: "cultura",  label: "Cultura",     icon: "landmark", color: "var(--violet)" },
  { id: "outdoor",  label: "Outdoor",     icon: "bike",     color: "var(--teal)" },
  { id: "food",     label: "Food & Drink",icon: "food",     color: "var(--amber)" },
  { id: "sport",    label: "Sport",       icon: "run",      color: "var(--green)" },
  { id: "famiglia", label: "Famiglia",    icon: "family",   color: "var(--cyan)" },
  { id: "nightlife",label: "Nightlife",   icon: "moon",     color: "var(--violet)" },
];
function SetInterests({ value, onChange }: any) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="s-interests">
      {SET_INTERESTS.map((i) => (
        <button key={i.id} className={"s-int-chip" + (value.includes(i.id) ? " on" : "")} style={{ "--ic": i.color }} onClick={() => toggle(i.id)}>
          <Icon name={i.icon} size={14} />{i.label}
        </button>
      ))}
    </div>
  );
}

/* ===================== DELETE MODAL ===================== */
function DeleteModal({ onCancel, onConfirm }: any) {
  useEffect(() => {
    const f = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onCancel]);
  return (
    <div className="del-scrim" onClick={onCancel}>
      <div className="del-modal" onClick={(e) => e.stopPropagation()}>
        <div className="del-modal-head">
          <div className="del-ic"><Icon name="warn" size={22} /></div>
          <h2>Eliminare l'account?</h2>
          <p>Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati permanentemente dal sistema.</p>
        </div>
        <div className="del-modal-foot">
          <button className="del-cancel" onClick={onCancel}>Annulla</button>
          <button className="del-confirm" onClick={onConfirm}>Elimina account</button>
        </div>
      </div>
    </div>
  );
}

/* ===================== PAGE ===================== */
export function SettingsPage({ page, setPage, theme, setTheme, user, setUser }: any) {
  /* appearance */
  const themeToMode = (t) => (t === "day" ? "light" : "dark");
  const [themeMode, setThemeModeState] = useState(themeToMode(theme));
  const [visualEffects, setVisualEffects] = useState("full");

  /* language & format */
  const [language, setLanguage] = useState("it");
  const [timeFormat, setTimeFormat] = useState("24h");
  const [distUnit, setDistUnit] = useState("km");

  /* notifications */
  const [notif, setNotif] = useState({ email: true, push: true, events: true, activities: true, cityAlerts: true });
  const toggleNotif = (k) => setNotif((n) => ({ ...n, [k]: !n[k] }));

  /* privacy */
  const [locationMode, setLocationMode] = useState("while_using");
  const [participVis, setParticipVis] = useState("public");
  const [showProfile, setShowProfile] = useState(true);

  /* preferences */
  const [interests, setInterests] = useState(["musica", "outdoor", "food"]);
  const [reliableOnly, setReliableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  /* accessibility */
  const [reduceAnim, setReduceAnim] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largerText, setLargerText] = useState(false);

  /* account */
  const [deleting, setDeleting] = useState(false);

  /* sync theme mode → real theme */
  const applyThemeMode = (mode) => {
    setThemeModeState(mode);
    if (mode === "light") setTheme("day");
    else if (mode === "dark") setTheme("night");
    else setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day");
  };

  /* sync visual effects → glow */
  useEffect(() => {
    document.documentElement.style.setProperty("--glow", visualEffects === "reduced" ? "0.14" : "0.42");
  }, [visualEffects]);

  /* sync a11y classes */
  useEffect(() => { document.documentElement.classList.toggle("a11y-reduce-motion", reduceAnim); }, [reduceAnim]);
  useEffect(() => { document.documentElement.classList.toggle("a11y-high-contrast", highContrast); }, [highContrast]);
  useEffect(() => { document.documentElement.classList.toggle("a11y-larger-text", largerText); }, [largerText]);

  return (
    <div className="settings-scene">
      <div className="events-header">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      </div>

      <div className="settings-wrap">
        <div className="settings-heading">
          <h1>Impostazioni</h1>
          <p>Personalizza l'aspetto, le notifiche e la tua esperienza nell'app.</p>
        </div>

        <div className="settings-grid">

          {/* 1 — Aspetto */}
          <SetCard num={1} title="Aspetto" desc="Tema e intensità degli effetti visivi." icon="sun" color="var(--amber)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 10 }}>Tema</div>
              <SetTheme value={themeMode} onChange={applyThemeMode} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Effetti visivi</div>
              <SetRadio value={visualEffects} onChange={setVisualEffects} options={[
                { id: "full",    label: "Completi", icon: "sparkle" },
                { id: "reduced", label: "Ridotti",  icon: "gauge" },
              ]} />
            </div>
          </SetCard>

          {/* 2 — Lingua e formato */}
          <SetCard num={2} title="Lingua e formato" desc="Lingua dell'interfaccia e formati di base." icon="globe" color="var(--cyan)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Lingua</div>
              <SetRadio value={language} onChange={setLanguage} options={[
                { id: "it", label: "Italiano" }, { id: "en", label: "English" }, { id: "de", label: "Deutsch" },
              ]} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Formato orario</div>
              <SetRadio value={timeFormat} onChange={setTimeFormat} options={[
                { id: "24h", label: "24 ore" }, { id: "12h", label: "12 ore" },
              ]} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Distanze</div>
              <SetRadio value={distUnit} onChange={setDistUnit} options={[
                { id: "km", label: "Chilometri" }, { id: "mi", label: "Miglia" },
              ]} />
            </div>
          </SetCard>

          {/* 3 — Notifiche */}
          <SetCard num={3} title="Notifiche" desc="Canali e categorie di aggiornamento." icon="bell" color="var(--magenta)">
            <div className="s-sublabel">Canali</div>
            <SetRow label="Email" sub="Ricevi aggiornamenti via email." on={notif.email} onChange={() => toggleNotif("email")} />
            <SetRow label="Push" sub="Notifiche in tempo reale su questo dispositivo." on={notif.push} onChange={() => toggleNotif("push")} />
            <div className="s-div"></div>
            <div className="s-sublabel">Categorie</div>
            <SetRow label="Eventi" sub="Promemoria ed aggiornamenti sugli eventi." on={notif.events} onChange={() => toggleNotif("events")} />
            <SetRow label="Attività" sub="Nuove attività e aggiornamenti." on={notif.activities} onChange={() => toggleNotif("activities")} />
            <SetRow label="Avvisi città" sub="Comunicazioni importanti dal comune." on={notif.cityAlerts} onChange={() => toggleNotif("cityAlerts")} />
          </SetCard>

          {/* 4 — Privacy e posizione */}
          <SetCard num={4} title="Privacy e posizione" desc="Controllo sulla tua posizione e visibilità." icon="pin" color="var(--teal)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Usa la mia posizione</div>
              <SetRadio value={locationMode} onChange={setLocationMode} options={[
                { id: "always",      label: "Sempre" },
                { id: "while_using", label: "In uso" },
                { id: "never",       label: "Mai" },
              ]} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Visibilità partecipazioni</div>
              <SetRadio value={participVis} onChange={setParticipVis} options={[
                { id: "public",            label: "Pubblica" },
                { id: "organizers_only",   label: "Solo organizzatori" },
                { id: "private",           label: "Privata" },
              ]} />
            </div>
            <div className="s-div"></div>
            <SetRow label="Mostra profilo nei partecipanti" sub="Visibile nelle liste partecipanti." on={showProfile} onChange={setShowProfile} />
          </SetCard>

          {/* 5 — Preferenze */}
          <SetCard num={5} title="Preferenze" desc="Interessi e filtri per i contenuti consigliati." icon="sparkle" color="var(--violet)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 10 }}>I tuoi interessi</div>
              <SetInterests value={interests} onChange={setInterests} />
            </div>
            <div className="s-div"></div>
            <SetRow label="Solo attività affidabili" sub="Mostra solo attività con autori certificati." on={reliableOnly} onChange={setReliableOnly} />
            <SetRow label="Solo attività verificate" sub="Filtra contenuti verificati dalla community." on={verifiedOnly} onChange={setVerifiedOnly} />
          </SetCard>

          {/* 6 — Accessibilità */}
          <SetCard num={6} title="Accessibilità" desc="Opzioni per migliorare leggibilità e usabilità." icon="gauge" color="var(--green)">
            <SetRow label="Riduci animazioni" sub="Disabilita transizioni ed effetti pulsanti." on={reduceAnim} onChange={setReduceAnim} />
            <div className="s-div"></div>
            <SetRow label="Aumenta contrasto" sub="Migliora la leggibilità di testi e bordi." on={highContrast} onChange={setHighContrast} />
            <div className="s-div"></div>
            <SetRow label="Testo più grande" sub="Scala la tipografia per una lettura più comoda." on={largerText} onChange={setLargerText} />
          </SetCard>

          {/* 7 — Account (full-width) */}
          <div className="s-card s-full anim-in" style={{ "--sc": "var(--cyan)", animationDelay: "420ms" }}>
            <div className="s-card-head">
              <span className="s-card-ic"><Icon name="users" size={19} /></span>
              <div className="s-num-title">
                <div className="s-num">07</div>
                <div className="s-title">Account</div>
                <div className="s-desc">Gestisci il tuo profilo e le opzioni di sessione.</div>
              </div>
            </div>
            <div className="s-account-body">
              <div className="s-account-user">
                <div className="s-account-av">{user?.avatar || "MR"}</div>
                <div className="s-account-info">
                  <div className="s-account-name">{user?.name || "Marco Rossi"}</div>
                  <div className="s-account-email">{user?.email || "marco.rossi@example.com"}</div>
                  <div className="s-account-badge"><Icon name="shieldCheck" size={9} />Account verificato</div>
                </div>
                {/* Simulated role selector for testing the revamped pages */}
                <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="s-sublabel" style={{ fontSize: 9, marginBottom: 0 }}>Simula Ruolo</label>
                  <select
                    className="revamp-select"
                    value={user?.role || "registered_user"}
                    onChange={(e) => setUser({ ...user, role: e.target.value })}
                  >
                    <option value="anonymous">Ospite (Anonimo)</option>
                    <option value="registered_user">Utente Registrato</option>
                    <option value="certified_entity">Ente Certificato</option>
                    <option value="municipal_admin">Admin Comunale</option>
                    <option value="system_admin">Admin di Sistema</option>
                  </select>
                </div>
              </div>
              <div className="s-account-actions">
                <button className="s-acc-btn accent" onClick={() => setPage("profilo")}><Icon name="users" size={17} />Vai al profilo</button>
                <button className="s-acc-btn" onClick={() => setPage("privacy")}><Icon name="settings" size={17} />Privacy policy</button>
                <button className="s-acc-btn" onClick={() => setPage("termini")}><Icon name="ticket" size={17} />Termini di servizio</button>
                <button className="s-acc-btn" style={{ marginLeft: "auto" }} onClick={() => {
                  setUser({ id: "g1", name: "Ospite", email: "ospite@example.com", role: "anonymous", avatar: "O" });
                  setPage("login");
                }}><Icon name="x" size={17} />Logout</button>
                <button className="s-acc-btn danger" onClick={() => setDeleting(true)}><Icon name="warn" size={17} />Elimina account</button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {deleting && (
        <DeleteModal onCancel={() => setDeleting(false)} onConfirm={() => setDeleting(false)} />
      )}
    </div>
  );
}
