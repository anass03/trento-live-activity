/* ===========================================================
   Trento Live Activity — IMPOSTAZIONI page
   =========================================================== */
import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import {
  getSettings,
  updateAppearance,
  updateLanguageFormat,
  updateNotifications,
  updatePrivacyLocation,
  updatePreferences,
  updateAccessibility,
  deleteAccount,
  logout as apiLogout,
  UserSettings
} from "../lib/api";

/* ===================== CARD SHELL ===================== */
function SetCard({ num, title, desc, icon, color, children, full }: any) {
  return (
    <div className={"s-card anim-in" + (full ? " s-full" : "")} style={{ "--sc": color || "var(--accent)", animationDelay: (num * 60) + "ms" } as React.CSSProperties}>
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
function SetToggle({ on, onChange, disabled }: any) {
  return <button className={"s-toggle" + (on ? " on" : "")} disabled={disabled} onClick={() => onChange(!on)} role="switch" aria-checked={on}></button>;
}

/* ===================== TOGGLE ROW ===================== */
function SetRow({ label, sub, on, onChange, disabled }: any) {
  const id = "st-" + label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="s-row">
      <div>
        <div className="s-row-label" id={id}>{label}</div>
        {sub && <div className="s-row-sub">{sub}</div>}
      </div>
      <SetToggle on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}

/* ===================== RADIO PILLS ===================== */
function SetRadio({ options, value, onChange, disabled }: any) {
  return (
    <div className="s-radio">
      {options.map((o) => (
        <button key={o.id} disabled={disabled} className={"s-rpill" + (value === o.id ? " on" : "")} onClick={() => onChange(o.id)}>
          {o.icon && <Icon name={o.icon} size={14} />}{o.label}
        </button>
      ))}
    </div>
  );
}

/* ===================== THEME CARDS ===================== */
function SetTheme({ value, onChange, disabled }: any) {
  const opts = [
    { id: "light", label: "Chiaro",    cls: "tc-light" },
    { id: "dark",  label: "Scuro",     cls: "tc-dark"  },
    { id: "system",label: "Automatico",cls: "tc-auto"  },
  ];
  return (
    <div className="s-theme-cards">
      {opts.map((o) => (
        <button key={o.id} disabled={disabled} className={"s-theme-card " + o.cls + (value === o.id ? " on" : "")} onClick={() => onChange(o.id)}>
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
  { id: "outdoor",  label: "Outdoor",     icon: "bike",     color: "var(--teal)" },
  { id: "cultura",  label: "Cultura",     icon: "landmark", color: "var(--violet)" },
  { id: "musica",   label: "Musica",      icon: "music",    color: "var(--magenta)" },
  { id: "food",     label: "Food & Drink",icon: "food",     color: "var(--amber)" },
  { id: "sport",    label: "Sport",       icon: "run",      color: "var(--green)" },
];
function SetInterests({ value, onChange, disabled }: any) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="s-interests">
      {SET_INTERESTS.map((i) => (
        <button key={i.id} disabled={disabled} className={"s-int-chip" + (value.includes(i.id) ? " on" : "")} style={{ "--ic": i.color } as React.CSSProperties} onClick={() => toggle(i.id)}>
          <Icon name={i.icon} size={14} />{i.label}
        </button>
      ))}
    </div>
  );
}

/* ===================== DELETE MODAL ===================== */
function DeleteModal({ onCancel, onConfirm }: any) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const f = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onCancel]);

  const handleDel = async () => {
    setError("");
    setLoading(true);
    try {
      await onConfirm(pass);
    } catch (err: any) {
      setError(err.message || "Errore durante la cancellazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="del-scrim" onClick={onCancel}>
      <div className="del-modal" onClick={(e) => e.stopPropagation()}>
        <div className="del-modal-head">
          <div className="del-ic"><Icon name="warn" size={22} /></div>
          <h2>Eliminare l'account?</h2>
          <p>Questa azione è irreversibile. Inserisci la tua password per confermare la rimozione definitiva di tutti i tuoi dati.</p>
        </div>
        
        {error && (
          <div className="revamp-status-pill danger" style={{ margin: "10px 0", justifyContent: "center" }}>
            {error}
          </div>
        )}

        <div className="revamp-form-group" style={{ margin: "16px 0", textAlign: "left" }}>
          <label className="revamp-form-label">Password Corrente</label>
          <div className="revamp-form-input-wrap">
            <Icon name="key" size={16} />
            <input
              type="password"
              className="revamp-form-input"
              placeholder="••••••••"
              value={pass}
              disabled={loading}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
        </div>

        <div className="del-modal-foot">
          <button className="del-cancel" disabled={loading} onClick={onCancel}>Annulla</button>
          <button className="del-confirm" disabled={loading} onClick={handleDel}>
            {loading ? "Rimozione..." : "Elimina account"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== PAGE ===================== */
export function SettingsPage({ page, setPage, theme, setTheme, user, setUser, themeMode, setThemeMode }: any) {
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  /* appearance */
  const [visualEffects, setVisualEffects] = useState("full");

  /* language & format */
  const [language, setLanguage] = useState("it");
  const [timeFormat, setTimeFormat] = useState("24h");
  const [distUnit, setDistUnit] = useState("km");

  /* notifications */
  const [notif, setNotif] = useState({ email: true, push: true, events: true, activities: true, cityAlerts: true });

  /* privacy */
  const [locationMode, setLocationMode] = useState("while_using");
  const [participVis, setParticipVis] = useState("public");
  const [showProfile, setShowProfile] = useState(true);

  /* preferences */
  const [interests, setInterests] = useState<string[]>([]);
  const [reliableOnly, setReliableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  /* accessibility */
  const [reduceAnim, setReduceAnim] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largerText, setLargerText] = useState(false);

  /* account */
  const [deleting, setDeleting] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (user?.role === "anonymous") {
        setLoading(false);
        return;
      }
      try {
        const s = await getSettings();
        setVisualEffects(s.visualEffects || "full");
        setLanguage(s.language || "it");
        setTimeFormat(s.timeFormat || "24h");
        setDistUnit(s.distanceUnit || "km");
        setNotif({
          email: s.emailNotificationsEnabled,
          push: s.pushNotificationsEnabled,
          events: s.eventNotificationsEnabled,
          activities: s.activityNotificationsEnabled,
          cityAlerts: s.cityAlertNotificationsEnabled,
        });
        setLocationMode(s.locationMode || "while_using");
        setParticipVis(s.participationVisibility || "public");
        setShowProfile(s.showProfileInParticipants);
        setInterests(s.interestsJson || []);
        setReliableOnly(s.showOnlyReliableActivities);
        setVerifiedOnly(s.showVerifiedActivities);
        setReduceAnim(s.reduceAnimations);
        setHighContrast(s.increaseContrast);
        setLargerText(s.largerText);
      } catch (err) {
        console.error("Failed to fetch settings from server:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user?.role]);

  /* sync theme mode → real theme */
  const applyThemeMode = async (mode: string) => {
    setThemeMode(mode);
    if (user?.role !== "anonymous") {
      setSavingSection("aspetto");
      try {
        await updateAppearance({ themeMode: mode, visualEffects });
      } catch (err) {
        console.error(err);
      } finally {
        setSavingSection(null);
      }
    }
  };

  const handleVisualEffects = async (val: string) => {
    setVisualEffects(val);
    if (user?.role !== "anonymous") {
      setSavingSection("aspetto");
      try {
        await updateAppearance({ themeMode, visualEffects: val });
      } catch (err) {
        console.error(err);
      } finally {
        setSavingSection(null);
      }
    }
  };

  const handleLanguageFormat = async (key: string, val: string) => {
    const payload = {
      language: key === "lang" ? val : language,
      timeFormat: key === "time" ? val : timeFormat,
      distanceUnit: key === "dist" ? val : distUnit,
    };
    if (key === "lang") setLanguage(val);
    if (key === "time") setTimeFormat(val);
    if (key === "dist") setDistUnit(val);

    if (user?.role !== "anonymous") {
      setSavingSection("format");
      try {
        await updateLanguageFormat(payload);
      } catch (err) {
        console.error(err);
      } finally {
        setSavingSection(null);
      }
    }
  };

  const handleNotifications = async (key: string, val: boolean) => {
    const updated = { ...notif, [key]: val };
    setNotif(updated);
    if (user?.role !== "anonymous") {
      setSavingSection("notif");
      try {
        await updateNotifications({
          emailNotificationsEnabled: updated.email,
          pushNotificationsEnabled: updated.push,
          eventNotificationsEnabled: updated.events,
          activityNotificationsEnabled: updated.activities,
          cityAlertNotificationsEnabled: updated.cityAlerts,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSavingSection(null);
      }
    }
  };

  const handlePrivacyLocation = async (key: string, val: any) => {
    let mode = locationMode;
    let vis = participVis;
    let show = showProfile;

    if (key === "loc") { setLocationMode(val); mode = val; }
    if (key === "vis") { setParticipVis(val); vis = val; }
    if (key === "show") { setShowProfile(val); show = val; }

    if (user?.role !== "anonymous") {
      setSavingSection("privacy");
      try {
        await updatePrivacyLocation({
          locationMode: mode,
          participationVisibility: vis,
          showProfileInParticipants: show,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSavingSection(null);
      }
    }
  };

  const handlePreferences = async (key: string, val: any) => {
    let list = interests;
    let reliable = reliableOnly;
    let verified = verifiedOnly;

    if (key === "ints") { setInterests(val); list = val; }
    if (key === "rel") { setReliableOnly(val); reliable = val; }
    if (key === "ver") { setVerifiedOnly(val); verified = val; }

    if (user?.role !== "anonymous") {
      setSavingSection("pref");
      try {
        await updatePreferences({
          interestsJson: list,
          showOnlyReliableActivities: reliable,
          showVerifiedActivities: verified,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSavingSection(null);
      }
    }
  };

  const handleAccessibility = async (key: string, val: boolean) => {
    let anim = reduceAnim;
    let contrast = highContrast;
    let text = largerText;

    if (key === "anim") { setReduceAnim(val); anim = val; }
    if (key === "contrast") { setHighContrast(val); contrast = val; }
    if (key === "text") { setLargerText(val); text = val; }

    if (user?.role !== "anonymous") {
      setSavingSection("a11y");
      try {
        await updateAccessibility({
          reduceAnimations: anim,
          increaseContrast: contrast,
          largerText: text,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSavingSection(null);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    } finally {
      setUser({ id: null, name: "Ospite", email: "ospite@example.com", role: "anonymous", avatar: "O" });
      setPage("login");
    }
  };

  const handleConfirmDelete = async (password: string) => {
    await deleteAccount({ currentPassword: password });
    setDeleting(false);
    setUser({ id: null, name: "Ospite", email: "ospite@example.com", role: "anonymous", avatar: "O" });
    setPage("login");
  };



  /* sync visual effects → glow */
  useEffect(() => {
    document.documentElement.style.setProperty("--glow", visualEffects === "reduced" ? "0.14" : "0.42");
  }, [visualEffects]);

  /* sync a11y classes */
  useEffect(() => { document.documentElement.classList.toggle("a11y-reduce-motion", reduceAnim); }, [reduceAnim]);
  useEffect(() => { document.documentElement.classList.toggle("a11y-high-contrast", highContrast); }, [highContrast]);
  useEffect(() => { document.documentElement.classList.toggle("a11y-larger-text", largerText); }, [largerText]);

  if (loading) {
    return (
      <div className="settings-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          Caricamento impostazioni in corso...
        </div>
      </div>
    );
  }

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
              <SetTheme value={themeMode} onChange={applyThemeMode} disabled={savingSection === "aspetto"} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Effetti visivi</div>
              <SetRadio value={visualEffects} onChange={handleVisualEffects} disabled={savingSection === "aspetto"} options={[
                { id: "full",    label: "Completi", icon: "sparkle" },
                { id: "reduced", label: "Ridotti",  icon: "gauge" },
              ]} />
            </div>
          </SetCard>

          {/* 2 — Lingua e formato */}
          <SetCard num={2} title="Lingua e formato" desc="Lingua dell'interfaccia e formati di base." icon="globe" color="var(--cyan)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Lingua</div>
              <SetRadio value={language} onChange={(val) => handleLanguageFormat("lang", val)} disabled={savingSection === "format"} options={[
                { id: "it", label: "Italiano" }, { id: "en", label: "English" }, { id: "de", label: "Deutsch" },
              ]} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Formato orario</div>
              <SetRadio value={timeFormat} onChange={(val) => handleLanguageFormat("time", val)} disabled={savingSection === "format"} options={[
                { id: "24h", label: "24 ore" }, { id: "12h", label: "12 ore" },
              ]} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Distanze</div>
              <SetRadio value={distUnit} onChange={(val) => handleLanguageFormat("dist", val)} disabled={savingSection === "format"} options={[
                { id: "km", label: "Chilometri" }, { id: "mi", label: "Miglia" },
              ]} />
            </div>
          </SetCard>

          {/* 3 — Notifiche */}
          <SetCard num={3} title="Notifiche" desc="Canali e categorie di aggiornamento." icon="bell" color="var(--magenta)">
            <div className="s-sublabel">Canali</div>
            <SetRow label="Email" sub="Ricevi aggiornamenti via email." on={notif.email} onChange={(val) => handleNotifications("email", val)} disabled={savingSection === "notif"} />
            <SetRow label="Push" sub="Notifiche in tempo reale su questo dispositivo." on={notif.push} onChange={(val) => handleNotifications("push", val)} disabled={savingSection === "notif"} />
            <div className="s-div"></div>
            <div className="s-sublabel">Categorie</div>
            <SetRow label="Eventi" sub="Promemoria ed aggiornamenti sugli eventi." on={notif.events} onChange={(val) => handleNotifications("events", val)} disabled={savingSection === "notif"} />
            <SetRow label="Attività" sub="Nuove attività e aggiornamenti." on={notif.activities} onChange={(val) => handleNotifications("activities", val)} disabled={savingSection === "notif"} />
            <SetRow label="Avvisi città" sub="Comunicazioni importanti dal comune." on={notif.cityAlerts} onChange={(val) => handleNotifications("cityAlerts", val)} disabled={savingSection === "notif"} />
          </SetCard>

          {/* 4 — Privacy e posizione */}
          <SetCard num={4} title="Privacy e posizione" desc="Controllo sulla tua posizione e visibilità." icon="pin" color="var(--teal)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Usa la mia posizione</div>
              <SetRadio value={locationMode} onChange={(val) => handlePrivacyLocation("loc", val)} disabled={savingSection === "privacy"} options={[
                { id: "always",      label: "Sempre" },
                { id: "while_using", label: "In uso" },
                { id: "never",       label: "Mai" },
              ]} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>Visibilità partecipazioni</div>
              <SetRadio value={participVis} onChange={(val) => handlePrivacyLocation("vis", val)} disabled={savingSection === "privacy"} options={[
                { id: "public",            label: "Pubblica" },
                { id: "organizers_only",   label: "Solo organizzatori" },
                { id: "private",           label: "Privata" },
              ]} />
            </div>
            <div className="s-div"></div>
            <SetRow label="Mostra profilo nei partecipanti" sub="Visibile nelle liste partecipanti." on={showProfile} onChange={(val) => handlePrivacyLocation("show", val)} disabled={savingSection === "privacy"} />
          </SetCard>

          {/* 5 — Preferenze */}
          <SetCard num={5} title="Preferenze" desc="Interessi e filtri per i contenuti consigliati." icon="sparkle" color="var(--violet)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 10 }}>I tuoi interessi</div>
              <SetInterests value={interests} onChange={(val) => handlePreferences("ints", val)} disabled={savingSection === "pref"} />
            </div>
            <div className="s-div"></div>
            <SetRow label="Solo attività affidabili" sub="Mostra solo attività con autori certificati." on={reliableOnly} onChange={(val) => handlePreferences("rel", val)} disabled={savingSection === "pref"} />
            <SetRow label="Solo attività verificate" sub="Filtra contenuti verificati dalla community." on={verifiedOnly} onChange={(val) => handlePreferences("ver", val)} disabled={savingSection === "pref"} />
          </SetCard>

          {/* 6 — Accessibilità */}
          <SetCard num={6} title="Accessibilità" desc="Opzioni per migliorare leggibilità e usabilità." icon="gauge" color="var(--green)">
            <SetRow label="Riduci animazioni" sub="Disabilita transizioni ed effetti pulsanti." on={reduceAnim} onChange={(val) => handleAccessibility("anim", val)} disabled={savingSection === "a11y"} />
            <div className="s-div"></div>
            <SetRow label="Aumenta contrasto" sub="Migliora la leggibilità di testi e bordi." on={highContrast} onChange={(val) => handleAccessibility("contrast", val)} disabled={savingSection === "a11y"} />
            <div className="s-div"></div>
            <SetRow label="Testo più grande" sub="Scala la tipografia per una lettura più comoda." on={largerText} onChange={(val) => handleAccessibility("text", val)} disabled={savingSection === "a11y"} />
          </SetCard>

          {/* 7 — Account (full-width) */}
          <div className="s-card s-full anim-in" style={{ "--sc": "var(--cyan)", animationDelay: "420ms" } as React.CSSProperties}>
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
                  <div className="s-account-name">{user?.name || "Ospite"}</div>
                  <div className="s-account-email">{user?.email || "Accesso ospite"}</div>
                  <div className="s-account-badge"><Icon name="shieldCheck" size={9} />Account attivo</div>
                </div>

              </div>
              <div className="s-account-actions">
                <button className="s-acc-btn accent" onClick={() => setPage("profilo")}><Icon name="users" size={17} />Vai al profilo</button>
                <button className="s-acc-btn" onClick={() => setPage("privacy")}><Icon name="settings" size={17} />Privacy policy</button>
                <button className="s-acc-btn" onClick={() => setPage("termini")}><Icon name="ticket" size={17} />Termini di servizio</button>
                <button className="s-acc-btn" style={{ marginLeft: "auto" }} onClick={handleLogout}><Icon name="x" size={17} />Logout</button>
                {user?.role !== "anonymous" && (
                  <button className="s-acc-btn danger" onClick={() => setDeleting(true)}><Icon name="warn" size={17} />Elimina account</button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {deleting && (
        <DeleteModal onCancel={() => setDeleting(false)} onConfirm={handleConfirmDelete} />
      )}
    </div>
  );
}
