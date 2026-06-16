/* ===========================================================
   Trento Live Activity — IMPOSTAZIONI page
   =========================================================== */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { LegalModal } from "../components/ui/LegalModal";
import {
  getSettings,
  updateAppearance,
  updateLanguageFormat,
  updateNotifications,
  updatePrivacyLocation,
  updateAccessibility,
  deleteAccount,
  logout as apiLogout,
  registerDeviceToken,
  unregisterDeviceToken,
  sendTestPush,
  updateConsent,
} from "../lib/api";
import { requestFcmToken, revokeFcmToken } from "../lib/firebase";
import {
  setLanguage as setUiLanguage,
  currentLanguage,
  getTimeFormat,
  getDistUnit,
  getLocationMode,
  setStoredTimeFormat,
  setStoredDistUnit,
  setStoredLocationMode,
} from "../lib/i18n";

const FCM_TOKEN_KEY = "tla:fcmToken";

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
  const { t } = useTranslation();
  const opts = [
    { id: "light",  label: t("settings.appearance.themeLight"), cls: "tc-light" },
    { id: "dark",   label: t("settings.appearance.themeDark"),  cls: "tc-dark"  },
    { id: "system", label: t("settings.appearance.themeAuto"),  cls: "tc-auto"  },
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

/* ===================== DELETE MODAL ===================== */
function DeleteModal({ onCancel, onConfirm }: any) {
  const { t } = useTranslation();
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
      setError(err.message || t("settings.deleteModal.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="del-scrim" onClick={onCancel}>
      <div className="del-modal" onClick={(e) => e.stopPropagation()}>
        <div className="del-modal-head">
          <div className="del-ic"><Icon name="warn" size={22} /></div>
          <h2>{t("settings.deleteModal.title")}</h2>
          <p>{t("settings.deleteModal.desc")}</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ margin: "10px 0", justifyContent: "center" }}>
            {error}
          </div>
        )}

        <div className="revamp-form-group" style={{ margin: "16px 0", textAlign: "left" }}>
          <label className="revamp-form-label">{t("settings.deleteModal.currentPassword")}</label>
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
          <button className="del-cancel" disabled={loading} onClick={onCancel}>{t("settings.deleteModal.cancel")}</button>
          <button className="del-confirm" disabled={loading} onClick={handleDel}>
            {loading ? t("settings.deleteModal.deleting") : t("settings.deleteModal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== PAGE ===================== */
export function SettingsPage({ page, setPage, theme, setTheme, user, setUser, themeMode, setThemeMode }: any) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  /* appearance */
  const [visualEffects, setVisualEffects] = useState("full");

  /* language & format — la lingua UI parte da quella attiva in i18n */
  const [language, setLanguage] = useState<string>(() => currentLanguage());
  const [timeFormat, setTimeFormat] = useState("24h");
  const [distUnit, setDistUnit] = useState("km");

  /* notifications — push parte da OFF: è uno stato per-dispositivo (token FCM +
     permesso del browser), non una pura preferenza server, quindi non lo diamo
     per attivo finché non lo verifichiamo su QUESTO browser (vedi load sotto). */
  const [notif, setNotif] = useState({ email: true, push: false, events: true, activities: true, cityAlerts: true });
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<{ kind: "success" | "danger"; text: string } | null>(null);

  /* privacy — default "never": la posizione parte disattivata per i nuovi utenti */
  const [locationMode, setLocationMode] = useState("never");
  const [participVis, setParticipVis] = useState("public");
  const [showProfile, setShowProfile] = useState(true);
  /* Stato REALE del permesso di geolocalizzazione del browser (non la sola
     preferenza salvata): "granted" | "prompt" | "denied" | "unsupported". */
  const [geoPerm, setGeoPerm] = useState<"granted" | "prompt" | "denied" | "unsupported">("prompt");

  /* accessibility */
  const [reduceAnim, setReduceAnim] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largerText, setLargerText] = useState(false);

  /* account */
  const [deleting, setDeleting] = useState(false);
  /* legal docs shown in a modal instead of navigating away */
  const [legalDoc, setLegalDoc] = useState<"privacy" | "terms" | null>(null);

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (user?.role === "anonymous") {
        const tf = getTimeFormat();
        const du = getDistUnit();
        setTimeFormat(tf);
        setDistUnit(du);
        setLanguage(currentLanguage());
        setLocationMode(getLocationMode());
        try {
          const ve = localStorage.getItem("tla:visualEffects");
          if (ve) setVisualEffects(ve);
          const ra = localStorage.getItem("tla:reduceAnim");
          if (ra !== null) setReduceAnim(ra === "true");
          const hc = localStorage.getItem("tla:highContrast");
          if (hc !== null) setHighContrast(hc === "true");
          const lt = localStorage.getItem("tla:largerText");
          if (lt !== null) setLargerText(lt === "true");
        } catch {}
        setLoading(false);
        return;
      }
      try {
        const s = await getSettings();
        setVisualEffects(s.visualEffects || "full");
        const lang = s.language || currentLanguage();
        setLanguage(lang);
        // Allinea la lingua reale della UI a quella salvata sul backend.
        if (lang === "it" || lang === "en") setUiLanguage(lang);
        const tf = s.timeFormat || "24h";
        const du = s.distanceUnit || "km";
        setTimeFormat(tf);
        setDistUnit(du);
        setStoredTimeFormat(tf);
        setStoredDistUnit(du);
        // Le push sono per-dispositivo: la preferenza server (pushNotificationsEnabled)
        // è globale per l'utente, ma su QUESTO browser le notifiche funzionano solo
        // se il permesso è "granted" e c'è un token FCM registrato (tracciato in
        // localStorage). Così un browser nuovo mostra lo switch OFF anche se l'utente
        // le aveva attivate su un altro device, evitando un toggle "attivo" ma inerte.
        let hasLocalToken = false;
        try { hasLocalToken = !!localStorage.getItem(FCM_TOKEN_KEY); } catch { /* ignore */ }
        const browserGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
        const pushOnThisDevice = !!s.pushNotificationsEnabled && browserGranted && hasLocalToken;
        setNotif({
          email: s.emailNotificationsEnabled,
          push: pushOnThisDevice,
          events: s.eventNotificationsEnabled,
          activities: s.activityNotificationsEnabled,
          cityAlerts: s.cityAlertNotificationsEnabled,
        });
        const locMode = s.locationMode || "never";
        setLocationMode(locMode);
        setStoredLocationMode(locMode);
        setParticipVis(s.participationVisibility || "public");
        setShowProfile(s.showProfileInParticipants);
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
    try { localStorage.setItem("tla:visualEffects", val); } catch {}
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
    if (key === "lang") {
      setLanguage(val);
      if (val === "it" || val === "en") setUiLanguage(val);
    }
    if (key === "time") { setTimeFormat(val); setStoredTimeFormat(val); }
    if (key === "dist") { setDistUnit(val); setStoredDistUnit(val); }

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

  /* Push reali: FCM token + registrazione device + consenso.
     Se la parte FCM fallisce (permesso negato, browser non supportato)
     il toggle NON cambia stato e mostriamo l'errore. */
  const handlePushToggle = async (val: boolean) => {
    setPushMsg(null);
    setPushBusy(true);
    // Stato ottimistico: l'interruttore scatta subito, così l'UI risponde senza
    // attendere il round-trip FCM (token + registrazione device). In caso di
    // errore lo riportiamo allo stato precedente più sotto.
    setNotif((n) => ({ ...n, push: val }));
    try {
      if (val) {
        let prev: string | null = null;
        try { prev = localStorage.getItem(FCM_TOKEN_KEY); } catch { /* ignore */ }
        const token = await requestFcmToken();
        // requestFcmToken() forza un token FCM nuovo ad ogni attivazione: se non
        // rimuoviamo dal server quello precedente di questo browser, lo stesso
        // utente accumula token "stale" e riceve la notifica più volte. Lo
        // deregistriamo prima di salvare il nuovo.
        if (prev && prev !== token) {
          try { await unregisterDeviceToken(prev); } catch { /* best-effort */ }
        }
        await registerDeviceToken(token);
        try { localStorage.setItem(FCM_TOKEN_KEY, token); } catch { /* ignore */ }
        try { await updateConsent("notif_push", true); } catch { /* best-effort */ }
        setPushMsg({ kind: "success", text: t("settings.notif.pushEnabled") });
      } else {
        let stored: string | null = null;
        try { stored = localStorage.getItem(FCM_TOKEN_KEY); } catch { /* ignore */ }
        if (stored) {
          try { await unregisterDeviceToken(stored); } catch { /* best-effort */ }
        }
        try { localStorage.removeItem(FCM_TOKEN_KEY); } catch { /* ignore */ }
        try { await revokeFcmToken(); } catch { /* best-effort */ }
        try { await updateConsent("notif_push", false); } catch { /* best-effort */ }
        setPushMsg({ kind: "success", text: t("settings.notif.pushDisabled") });
      }
      window.dispatchEvent(new CustomEvent("tla:consents-changed"));
    } catch (err: any) {
      setNotif((n) => ({ ...n, push: !val })); // rollback ottimistico
      setPushMsg({ kind: "danger", text: err?.message || t("settings.notif.pushError") });
      setPushBusy(false);
      return;
    }
    setPushBusy(false);
    // Persisti la preferenza sul backend (comportamento preesistente). Lo stato
    // UI è già aggiornato in modo ottimistico, qui confermiamo solo il salvataggio.
    await handleNotifications("push", val);
  };

  const handleTestPush = async () => {
    setPushMsg(null);
    try {
      // La notifica di test arriva solo ai device dell'utente corrente. Il
      // numero di destinatari è un'informazione da pannello admin, non da qui.
      await sendTestPush();
      setPushMsg({ kind: "success", text: t("settings.notif.testSent") });
    } catch (err: any) {
      setPushMsg({ kind: "danger", text: err?.message || t("settings.notif.pushError") });
    }
  };

  const handlePrivacyLocation = async (key: string, val: any) => {
    let mode = locationMode;
    let vis = participVis;
    let show = showProfile;

    if (key === "loc") {
      setLocationMode(val); mode = val; setStoredLocationMode(val);
      // Richiediamo il permesso reale SOLO quando l'utente attiva la posizione
      // ("sempre"/"in uso") e il browser non l'ha ancora concesso. Così il
      // prompt nativo compare su azione esplicita, non all'avvio.
      if ((val === "always" || val === "while_using") && geoPerm === "prompt"
          && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setGeoPerm("granted"),
          (err) => { if (err && err.code === err.PERMISSION_DENIED) setGeoPerm("denied"); },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
        );
      }
    }
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

  const handleAccessibility = async (key: string, val: boolean) => {
    let anim = reduceAnim;
    let contrast = highContrast;
    let text = largerText;

    if (key === "anim") { setReduceAnim(val); anim = val; }
    if (key === "contrast") { setHighContrast(val); contrast = val; }
    if (key === "text") { setLargerText(val); text = val; }

    if (user?.role === "anonymous") {
      try {
        localStorage.setItem("tla:reduceAnim", String(anim));
        localStorage.setItem("tla:highContrast", String(contrast));
        localStorage.setItem("tla:largerText", String(text));
      } catch {}
      return;
    }
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
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    } finally {
      setUser({ id: null, name: "", email: "", role: "anonymous", avatar: "" });
      setPage("home");
    }
  };

  const handleConfirmDelete = async (password: string) => {
    await deleteAccount({ currentPassword: password });
    setDeleting(false);
    setUser({ id: null, name: "", email: "", role: "anonymous", avatar: "" });
    setPage("home");
  };



  /* Riflette il permesso REALE del browser per la posizione. All'avvio la card
     mostrava sempre la preferenza salvata (es. "In uso") anche se l'utente non
     aveva mai concesso il permesso: qui interroghiamo l'API Permissions e ci
     teniamo aggiornati sui cambi. iOS/Safari spesso non espone la query per la
     geolocalizzazione → fallback a "prompt" (permesso da concedere). */
  useEffect(() => {
    let cancelled = false;
    let status: any = null;
    const onChange = () => { if (status && !cancelled) setGeoPerm(status.state); };
    (async () => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        if (!cancelled) setGeoPerm("unsupported");
        return;
      }
      const perms: any = (navigator as any).permissions;
      if (!perms || typeof perms.query !== "function") {
        if (!cancelled) setGeoPerm("prompt");
        return;
      }
      try {
        status = await perms.query({ name: "geolocation" as PermissionName });
        if (!cancelled) setGeoPerm(status.state);
        status.onchange = onChange;
      } catch {
        if (!cancelled) setGeoPerm("prompt");
      }
    })();
    return () => { cancelled = true; if (status) status.onchange = null; };
  }, []);

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
        <div className="events-header"><Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} /></div>
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          {t("settings.loading")}
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
          <h1>{t("settings.title")}</h1>
          <p>{t("settings.subtitle")}</p>
        </div>

        <div className="settings-grid">

          {/* 1 — Aspetto */}
          <SetCard num={1} title={t("settings.appearance.title")} desc={t("settings.appearance.desc")} icon="sun" color="var(--amber)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 10 }}>{t("settings.appearance.theme")}</div>
              <SetTheme value={themeMode} onChange={applyThemeMode} disabled={savingSection === "aspetto"} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>{t("settings.appearance.effects")}</div>
              <SetRadio value={visualEffects} onChange={handleVisualEffects} disabled={savingSection === "aspetto"} options={[
                { id: "full",    label: t("settings.appearance.effectsFull"),    icon: "sparkle" },
                { id: "reduced", label: t("settings.appearance.effectsReduced"), icon: "gauge" },
              ]} />
            </div>
          </SetCard>

          {/* 2 — Lingua e formato */}
          <SetCard num={2} title={t("settings.format.title")} desc={t("settings.format.desc")} icon="globe" color="var(--cyan)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>{t("settings.format.language")}</div>
              <SetRadio value={language} onChange={(val) => handleLanguageFormat("lang", val)} disabled={savingSection === "format"} options={[
                { id: "it", label: "Italiano" }, { id: "en", label: "English" },
              ]} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>{t("settings.format.timeFormat")}</div>
              <SetRadio value={timeFormat} onChange={(val) => handleLanguageFormat("time", val)} disabled={savingSection === "format"} options={[
                { id: "24h", label: t("settings.format.h24") }, { id: "12h", label: t("settings.format.h12") },
              ]} />
            </div>
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>{t("settings.format.distances")}</div>
              <SetRadio value={distUnit} onChange={(val) => handleLanguageFormat("dist", val)} disabled={savingSection === "format"} options={[
                { id: "km", label: t("settings.format.km") }, { id: "mi", label: t("settings.format.mi") },
              ]} />
            </div>
          </SetCard>

          {/* 3 — Notifiche (solo con account: sono preferenze server-side) */}
          {user?.role !== "anonymous" && (
          <SetCard num={3} title={t("settings.notif.title")} desc={t("settings.notif.desc")} icon="bell" color="var(--magenta)">
            <div className="s-sublabel">{t("settings.notif.channels")}</div>
            <SetRow label={t("settings.notif.email")} sub={t("settings.notif.emailSub")} on={notif.email} onChange={(val) => handleNotifications("email", val)} disabled={savingSection === "notif"} />
            <SetRow label={t("settings.notif.push")} sub={t("settings.notif.pushSub")} on={notif.push} onChange={handlePushToggle} disabled={pushBusy || savingSection === "notif"} />
            {pushMsg && (
              <div className={"revamp-status-pill " + pushMsg.kind} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
                <Icon name={pushMsg.kind === "success" ? "check" : "warn"} size={12} /> {pushMsg.text}
              </div>
            )}
            {notif.push && user?.role !== "anonymous" && (
              <button className="s-acc-btn" style={{ marginTop: 8, alignSelf: "flex-start" }} onClick={handleTestPush} disabled={pushBusy}>
                <Icon name="bell" size={15} />{t("settings.notif.sendTest")}
              </button>
            )}
            {/* Le categorie (nuovi eventi/attività/allerte) riguardano i
                cittadini: gli admin ricevono le notifiche di servizio
                (segnalazioni) a prescindere da questi interruttori. */}
            {user?.role === "registered_user" && (
              <>
                <div className="s-div"></div>
                <div className="s-sublabel">{t("settings.notif.categories")}</div>
                <SetRow label={t("settings.notif.events")} sub={t("settings.notif.eventsSub")} on={notif.events} onChange={(val) => handleNotifications("events", val)} disabled={savingSection === "notif"} />
                <SetRow label={t("settings.notif.activities")} sub={t("settings.notif.activitiesSub")} on={notif.activities} onChange={(val) => handleNotifications("activities", val)} disabled={savingSection === "notif"} />
                <SetRow label={t("settings.notif.cityAlerts")} sub={t("settings.notif.cityAlertsSub")} on={notif.cityAlerts} onChange={(val) => handleNotifications("cityAlerts", val)} disabled={savingSection === "notif"} />
              </>
            )}
          </SetCard>
          )}

          {/* 4 — Privacy e posizione. La posizione è universale: anche ospiti,
              enti e admin usano "individuami" sulla mappa (e il toast li manda
              qui), quindi mostriamo il controllo a tutti. Visibilità
              partecipazioni e profilo restano concetti da cittadino. */}
          <SetCard num={4} title={t("settings.privacy.title")} desc={t("settings.privacy.desc")} icon="pin" color="var(--teal)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>{t("settings.privacy.useLocation")}</div>
              <SetRadio value={locationMode} onChange={(val) => handlePrivacyLocation("loc", val)} disabled={savingSection === "privacy"} options={[
                { id: "always",      label: t("settings.privacy.always") },
                { id: "while_using", label: t("settings.privacy.whileUsing") },
                { id: "never",       label: t("settings.privacy.never") },
              ]} />
              {/* Quando l'utente sceglie "Mai" la posizione è disattivata per scelta:
                  mostriamo uno stato "off" invece del permesso del browser, che può
                  restare "granted" (il browser non revoca da solo cambiando la
                  preferenza dell'app). Negli altri casi riflettiamo il permesso reale. */}
              {(() => {
                const map = locationMode === "never"
                  ? { kind: "info", icon: "pin", key: "permOff" }
                  : {
                      granted:     { kind: "success", icon: "check", key: "permGranted" },
                      prompt:      { kind: "warning", icon: "pin",   key: "permPrompt" },
                      denied:      { kind: "danger",  icon: "warn",  key: "permDenied" },
                      unsupported: { kind: "info",    icon: "pin",   key: "permUnsupported" },
                    }[geoPerm];
                return (
                  <div className={"revamp-status-pill " + map.kind} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                    <Icon name={map.icon} size={12} /> {t("settings.privacy." + map.key)}
                  </div>
                );
              })()}
            </div>
            {user?.role === "registered_user" && (
              <>
                <div className="s-div"></div>
                <div>
                  <div className="s-sublabel" style={{ marginBottom: 8 }}>{t("settings.privacy.participVis")}</div>
                  <SetRadio value={participVis} onChange={(val) => handlePrivacyLocation("vis", val)} disabled={savingSection === "privacy"} options={[
                    { id: "public",            label: t("settings.privacy.public") },
                    { id: "organizers_only",   label: t("settings.privacy.organizersOnly") },
                    { id: "private",           label: t("settings.privacy.private") },
                  ]} />
                </div>
                <div className="s-div"></div>
                <SetRow label={t("settings.privacy.showProfile")} sub={t("settings.privacy.showProfileSub")} on={showProfile} onChange={(val) => handlePrivacyLocation("show", val)} disabled={savingSection === "privacy"} />
              </>
            )}
          </SetCard>

          {/* 5 — Accessibilità */}
          <SetCard num={5} title={t("settings.a11y.title")} desc={t("settings.a11y.desc")} icon="gauge" color="var(--green)">
            <SetRow label={t("settings.a11y.reduceAnim")} sub={t("settings.a11y.reduceAnimSub")} on={reduceAnim} onChange={(val) => handleAccessibility("anim", val)} disabled={savingSection === "a11y"} />
            <div className="s-div"></div>
            <SetRow label={t("settings.a11y.contrast")} sub={t("settings.a11y.contrastSub")} on={highContrast} onChange={(val) => handleAccessibility("contrast", val)} disabled={savingSection === "a11y"} />
            <div className="s-div"></div>
            <SetRow label={t("settings.a11y.largerText")} sub={t("settings.a11y.largerTextSub")} on={largerText} onChange={(val) => handleAccessibility("text", val)} disabled={savingSection === "a11y"} />
          </SetCard>

          {/* 7 — Account (full-width) */}
          <SetCard num={6} title={t("settings.account.title")} desc={t("settings.account.desc")} icon="users" color="var(--cyan)">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="s-account-av" style={{ width: 46, height: 46, fontSize: 17, flex: "none" }}>
                {user?.role === "anonymous" ? <Icon name="user" size={17} /> : (user?.avatar || "U")}
              </div>
              <div className="s-account-info" style={{ minWidth: 0 }}>
                <div className="s-account-name" style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.role === "anonymous" ? t("settings.guestName") : user?.name}
                </div>
                <div className="s-account-email" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.role === "anonymous" ? t("settings.guestEmail") : user?.email}
                </div>
                {user?.role !== "anonymous" && (
                  <div className="s-account-badge"><Icon name="shieldCheck" size={9} />{t("settings.account.activeBadge")}</div>
                )}
              </div>
            </div>
            <div className="s-div"></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {user?.role === "anonymous" ? (
                <>
                  <button className="s-acc-btn accent" style={{ width: "100%" }} onClick={() => setPage("login")}><Icon name="logIn" size={17} />{t("header.login")}</button>
                  <button className="s-acc-btn" style={{ width: "100%" }} onClick={() => setPage("registrazione")}><Icon name="user" size={17} />{t("header.register")}</button>
                </>
              ) : (
                <button className="s-acc-btn accent" style={{ width: "100%" }} onClick={() => setPage("profilo")}><Icon name="users" size={17} />{t("settings.account.goToProfile")}</button>
              )}
              <button className="s-acc-btn" style={{ width: "100%" }} onClick={() => setLegalDoc("privacy")}><Icon name="settings" size={17} />{t("settings.account.privacyPolicy")}</button>
              <button className="s-acc-btn" style={{ width: "100%" }} onClick={() => setLegalDoc("terms")}><Icon name="ticket" size={17} />{t("settings.account.terms")}</button>
              {user?.role !== "anonymous" && (
                <>
                  <div className="s-div"></div>
                  <button className="s-acc-btn" style={{ width: "100%" }} onClick={handleLogout}><Icon name="x" size={17} />{t("settings.account.logout")}</button>
                  <button className="s-acc-btn danger" style={{ width: "100%" }} onClick={() => setDeleting(true)}><Icon name="warn" size={17} />{t("settings.account.delete")}</button>
                </>
              )}
            </div>
          </SetCard>

        </div>
      </div>

      {deleting && (
        <DeleteModal onCancel={() => setDeleting(false)} onConfirm={handleConfirmDelete} />
      )}

      {legalDoc && (
        <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
      )}
    </div>
  );
}
