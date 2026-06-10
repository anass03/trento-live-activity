/* ===========================================================
   Trento Live Activity — IMPOSTAZIONI page
   =========================================================== */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  registerDeviceToken,
  unregisterDeviceToken,
  sendTestPush,
  updateConsent,
} from "../lib/api";
import { requestFcmToken, revokeFcmToken } from "../lib/firebase";
import { setLanguage as setUiLanguage, currentLanguage } from "../lib/i18n";

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

/* ===================== INTEREST CHIPS ===================== */
const SET_INTERESTS = [
  { id: "outdoor",  icon: "bike",     color: "var(--teal)" },
  { id: "cultura",  icon: "landmark", color: "var(--violet)" },
  { id: "musica",   icon: "music",    color: "var(--magenta)" },
  { id: "food",     icon: "food",     color: "var(--amber)" },
  { id: "sport",    icon: "run",      color: "var(--green)" },
];
function SetInterests({ value, onChange, disabled }: any) {
  const { t } = useTranslation();
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="s-interests">
      {SET_INTERESTS.map((i) => (
        <button key={i.id} disabled={disabled} className={"s-int-chip" + (value.includes(i.id) ? " on" : "")} style={{ "--ic": i.color } as React.CSSProperties} onClick={() => toggle(i.id)}>
          <Icon name={i.icon} size={14} />{t(`settings.interests.${i.id}`)}
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

  /* notifications */
  const [notif, setNotif] = useState({ email: true, push: true, events: true, activities: true, cityAlerts: true });
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<{ kind: "success" | "danger"; text: string } | null>(null);

  /* privacy */
  const [locationMode, setLocationMode] = useState("while_using");
  const [participVis, setParticipVis] = useState("public");
  const [showProfile, setShowProfile] = useState(true);

  /* preferences */
  const [interests, setInterests] = useState<string[]>([]);
  const [reliableOnly, setReliableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  /* parking display preference — client-side so it also applies to guests */
  const [parkingPref, setParkingPref] = useState<string>(() => {
    try { return localStorage.getItem("tla:parkingPref") || "both"; } catch { return "both"; }
  });

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
        const lang = s.language || currentLanguage();
        setLanguage(lang);
        // Allinea la lingua reale della UI a quella salvata sul backend.
        if (lang === "it" || lang === "en") setUiLanguage(lang);
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
    if (key === "lang") {
      setLanguage(val);
      // US-40: cambia davvero la lingua dell'interfaccia (persistita in tla:lang).
      if (val === "it" || val === "en") setUiLanguage(val);
    }
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

  /* Push reali: FCM token + registrazione device + consenso.
     Se la parte FCM fallisce (permesso negato, browser non supportato)
     il toggle NON cambia stato e mostriamo l'errore. */
  const handlePushToggle = async (val: boolean) => {
    setPushMsg(null);
    setPushBusy(true);
    try {
      if (val) {
        const token = await requestFcmToken();
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
      setPushMsg({ kind: "danger", text: err?.message || t("settings.notif.pushError") });
      setPushBusy(false);
      return; // il toggle resta com'era
    }
    setPushBusy(false);
    // Mantieni anche il flag sul backend (comportamento preesistente).
    await handleNotifications("push", val);
  };

  const handleTestPush = async () => {
    setPushMsg(null);
    try {
      const result = await sendTestPush();
      setPushMsg({ kind: "success", text: t("settings.notif.testSent", { count: result.tokensTargeted }) });
    } catch (err: any) {
      setPushMsg({ kind: "danger", text: err?.message || t("settings.notif.pushError") });
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

  const handleParkingPref = (val: string) => {
    setParkingPref(val);
    try { localStorage.setItem("tla:parkingPref", val); } catch { /* ignore */ }
    // Notify the parking widget (same tab) to re-read the preference instantly.
    window.dispatchEvent(new CustomEvent("tla:parkingpref"));
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

          {/* 3 — Notifiche */}
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
            <div className="s-div"></div>
            <div className="s-sublabel">{t("settings.notif.categories")}</div>
            <SetRow label={t("settings.notif.events")} sub={t("settings.notif.eventsSub")} on={notif.events} onChange={(val) => handleNotifications("events", val)} disabled={savingSection === "notif"} />
            <SetRow label={t("settings.notif.activities")} sub={t("settings.notif.activitiesSub")} on={notif.activities} onChange={(val) => handleNotifications("activities", val)} disabled={savingSection === "notif"} />
            <SetRow label={t("settings.notif.cityAlerts")} sub={t("settings.notif.cityAlertsSub")} on={notif.cityAlerts} onChange={(val) => handleNotifications("cityAlerts", val)} disabled={savingSection === "notif"} />
          </SetCard>

          {/* 4 — Privacy e posizione */}
          <SetCard num={4} title={t("settings.privacy.title")} desc={t("settings.privacy.desc")} icon="pin" color="var(--teal)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>{t("settings.privacy.useLocation")}</div>
              <SetRadio value={locationMode} onChange={(val) => handlePrivacyLocation("loc", val)} disabled={savingSection === "privacy"} options={[
                { id: "always",      label: t("settings.privacy.always") },
                { id: "while_using", label: t("settings.privacy.whileUsing") },
                { id: "never",       label: t("settings.privacy.never") },
              ]} />
            </div>
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
          </SetCard>

          {/* 5 — Preferenze */}
          <SetCard num={5} title={t("settings.pref.title")} desc={t("settings.pref.desc")} icon="sparkle" color="var(--violet)">
            <div>
              <div className="s-sublabel" style={{ marginBottom: 10 }}>{t("settings.pref.interests")}</div>
              <SetInterests value={interests} onChange={(val) => handlePreferences("ints", val)} disabled={savingSection === "pref"} />
            </div>
            <div className="s-div"></div>
            <SetRow label={t("settings.pref.reliableOnly")} sub={t("settings.pref.reliableOnlySub")} on={reliableOnly} onChange={(val) => handlePreferences("rel", val)} disabled={savingSection === "pref"} />
            <SetRow label={t("settings.pref.verifiedOnly")} sub={t("settings.pref.verifiedOnlySub")} on={verifiedOnly} onChange={(val) => handlePreferences("ver", val)} disabled={savingSection === "pref"} />
            <div className="s-div"></div>
            <div>
              <div className="s-sublabel" style={{ marginBottom: 8 }}>{t("settings.pref.parking")}</div>
              <SetRadio value={parkingPref} onChange={handleParkingPref} options={[
                { id: "both", label: t("settings.pref.parkingBoth"), icon: "grid" },
                { id: "car",  label: t("settings.pref.parkingCar"),  icon: "car" },
                { id: "bike", label: t("settings.pref.parkingBike"), icon: "bike" },
              ]} />
            </div>
          </SetCard>

          {/* 6 — Accessibilità */}
          <SetCard num={6} title={t("settings.a11y.title")} desc={t("settings.a11y.desc")} icon="gauge" color="var(--green)">
            <SetRow label={t("settings.a11y.reduceAnim")} sub={t("settings.a11y.reduceAnimSub")} on={reduceAnim} onChange={(val) => handleAccessibility("anim", val)} disabled={savingSection === "a11y"} />
            <div className="s-div"></div>
            <SetRow label={t("settings.a11y.contrast")} sub={t("settings.a11y.contrastSub")} on={highContrast} onChange={(val) => handleAccessibility("contrast", val)} disabled={savingSection === "a11y"} />
            <div className="s-div"></div>
            <SetRow label={t("settings.a11y.largerText")} sub={t("settings.a11y.largerTextSub")} on={largerText} onChange={(val) => handleAccessibility("text", val)} disabled={savingSection === "a11y"} />
          </SetCard>

          {/* 7 — Account (full-width) */}
          <div className="s-card s-full anim-in" style={{ "--sc": "var(--cyan)", animationDelay: "420ms" } as React.CSSProperties}>
            <div className="s-card-head">
              <span className="s-card-ic"><Icon name="users" size={19} /></span>
              <div className="s-num-title">
                <div className="s-num">07</div>
                <div className="s-title">{t("settings.account.title")}</div>
                <div className="s-desc">{t("settings.account.desc")}</div>
              </div>
            </div>
            <div className="s-account-body">
              <div className="s-account-user">
                <div className="s-account-av">{user?.avatar || "MR"}</div>
                <div className="s-account-info">
                  <div className="s-account-name">{user?.name || t("settings.guestName")}</div>
                  <div className="s-account-email">{user?.email || t("settings.guestEmail")}</div>
                  <div className="s-account-badge"><Icon name="shieldCheck" size={9} />{t("settings.account.activeBadge")}</div>
                </div>

              </div>
              <div className="s-account-actions">
                <button className="s-acc-btn accent" onClick={() => setPage("profilo")}><Icon name="users" size={17} />{t("settings.account.goToProfile")}</button>
                <button className="s-acc-btn" onClick={() => setPage("privacy")}><Icon name="settings" size={17} />{t("settings.account.privacyPolicy")}</button>
                <button className="s-acc-btn" onClick={() => setPage("termini")}><Icon name="ticket" size={17} />{t("settings.account.terms")}</button>
                <button className="s-acc-btn" style={{ marginLeft: "auto" }} onClick={handleLogout}><Icon name="x" size={17} />{t("settings.account.logout")}</button>
                {user?.role !== "anonymous" && (
                  <button className="s-acc-btn danger" onClick={() => setDeleting(true)}><Icon name="warn" size={17} />{t("settings.account.delete")}</button>
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
