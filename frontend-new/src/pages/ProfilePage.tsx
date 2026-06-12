import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getMyParticipations, leaveEvent, leaveActivity, getMe, regenerateRecoveryCodes } from "../lib/api";

const PROFILE_INTERESTS = [
  { id: "outdoor",  icon: "bike",     color: "var(--teal)" },
  { id: "cultura",  icon: "landmark", color: "var(--violet)" },
  { id: "musica",   icon: "music",    color: "var(--magenta)" },
  { id: "food",     icon: "food",     color: "var(--amber)" },
  { id: "sport",    icon: "run",      color: "var(--green)" },
];

const getCatColor = (cat?: string) => {
  switch (cat?.toLowerCase()) {
    case "musica": return "var(--magenta)";
    case "cultura": return "var(--violet)";
    case "food":
    case "cibo": return "var(--amber)";
    case "outdoor": return "var(--teal)";
    case "sport": return "var(--green)";
    default: return "var(--cyan)";
  }
};

const getCatIcon = (cat?: string) => {
  switch (cat?.toLowerCase()) {
    case "musica": return "music";
    case "cultura": return "landmark";
    case "food":
    case "cibo": return "food";
    case "outdoor": return "bike";
    case "sport": return "run";
    default: return "activity";
  }
};

export function ProfilePage({ page, setPage, theme, setTheme, user }: any) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("attivita");
  const [participations, setParticipations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const dateLocale = i18n.language?.startsWith("en") ? "en-GB" : "it-IT";

  const fetchParticipations = async () => {
    setLoading(true);
    try {
      const parts = await getMyParticipations();
      setParticipations(parts);
      const profile = await getMe();
      setUserProfile(profile);
    } catch (err) {
      console.error("Failed to load participations/profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchParticipations();
    }
  }, [user?.id]);

  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [regenPending, setRegenPending] = useState(false);
  const [regenError, setRegenError] = useState("");

  const handleRegenCodes = async () => {
    setRegenPending(true);
    setRegenError("");
    try {
      const res = await regenerateRecoveryCodes();
      setNewCodes(res.recoveryCodes || []);
    } catch (err: any) {
      setRegenError(err?.message || "Errore");
    } finally {
      setRegenPending(false);
    }
  };

  const handleCancel = async (item: any) => {
    try {
      if (item.targetType === "EVENT") {
        await leaveEvent(item.targetId);
      } else {
        await leaveActivity(item.targetId);
      }
      fetchParticipations();
    } catch (err) {
      console.error("Failed to cancel participation:", err);
    }
  };

  const interestsList = userProfile?.profile?.interessi || [];
  // Real author rating only: no hardcoded placeholder when the backend has no value.
  const rawRating = userProfile?.averageAuthorRating ?? userProfile?.profile?.averageAuthorRating;
  const authorRating = typeof rawRating === "number" ? rawRating : (rawRating != null && !Number.isNaN(Number(rawRating)) ? Number(rawRating) : null);

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-profile-wrap">
        <div className="revamp-profile-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "60ms" } as React.CSSProperties}>
          <div className="revamp-profile-flex">
            <div className="revamp-profile-av">
              {user.avatar || "MR"}
            </div>
            <div className="revamp-profile-info">
              <div className="revamp-profile-name">{user.name || t("settings.guestName")}</div>
              <div className="revamp-profile-email">{user.email || t("settings.guestEmail")}</div>
              <div className="revamp-profile-badge">
                <Icon name="shieldCheck" size={10} style={{ color: "var(--cyan)" }} /> {t("profile.verifiedAuthor")}
              </div>
            </div>
            <div className="revamp-profile-stats">
              <div className="revamp-profile-stat">
                <b>{participations.length}</b>
                <span>{t("profile.participations")}</span>
              </div>
              <div style={{ width: 1, background: "var(--border-soft-2)" }}></div>
              <div className="revamp-profile-stat">
                <b>{typeof authorRating === "number" ? authorRating.toFixed(1) : "—"}</b>
                <span>{t("profile.rating")}</span>
              </div>
              <div style={{ width: 1, background: "var(--border-soft-2)" }}></div>
              <div className="revamp-profile-stat">
                <b>{user?.role === "certified_entity" ? t("profile.yes") : t("profile.no")}</b>
                <span>{t("profile.certifiedEntity")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="revamp-profile-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "120ms" } as React.CSSProperties}>
          <div className="revamp-profile-nav">
            <button
              className={"revamp-profile-tab" + (activeTab === "attivita" ? " active" : "")}
              onClick={() => setActiveTab("attivita")}
            >
              {t("profile.tabBookings")}
            </button>
            <button
              className={"revamp-profile-tab" + (activeTab === "interessi" ? " active" : "")}
              onClick={() => setActiveTab("interessi")}
            >
              {t("profile.tabInterests")}
            </button>
            <button
              className={"revamp-profile-tab" + (activeTab === "info" ? " active" : "")}
              onClick={() => setActiveTab("info")}
            >
              {t("profile.tabInfo")}
            </button>
          </div>

          <div className="revamp-profile-tab-body">
            {activeTab === "attivita" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {loading && (
                  <div style={{ color: "var(--text-muted)", fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>
                    {t("profile.loadingBookings")}
                  </div>
                )}
                {!loading && participations.length === 0 && (
                  <div style={{ color: "var(--text-muted)", fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>
                    {t("profile.noBookings")}
                  </div>
                )}
                {!loading && participations.map((item) => {
                  const title = item.target?.title || item.target?.titolo || t("profile.fallbackTitle");
                  const cat = item.target?.category || item.target?.categoria || "altro";
                  const color = getCatColor(cat);
                  const iconName = getCatIcon(cat);
                  const when = item.target?.dateTime || item.target?.data || t("profile.toBeDefined");

                  return (
                    <div key={item.id} className="area-row" style={{ padding: "12px 14px", border: "1px solid var(--border-soft-2)", borderRadius: 12, background: "var(--chip-fill)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 8, background: `color-mix(in srgb, ${color} 16%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, color: color,
                          display: "grid", placeItems: "center"
                        }}>
                          <Icon name={iconName} size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>
                            <Icon name="clock" size={11} /> {when} | <Icon name="pin" size={11} /> {item.target?.location || "Trento"}
                          </div>
                        </div>
                        <button className="revamp-action-btn danger" style={{ height: 34 }} onClick={() => handleCancel(item)}>
                          <Icon name="x" size={12} /> {t("profile.cancelBooking")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "interessi" && (
              <div>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 12 }}>
                  {t("profile.interestsIntro")}
                </p>
                <div className="s-interests">
                  {PROFILE_INTERESTS.filter(item => interestsList.includes(item.id) || interestsList.length === 0).map((item) => (
                    <div key={item.id} className="s-int-chip on" style={{ "--ic": item.color } as React.CSSProperties}>
                      <Icon name={item.icon} size={14} /> {t(`settings.interests.${item.id}`)}
                    </div>
                  ))}
                  <button className="s-int-chip" style={{ "--ic": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("onboarding")}>
                    <Icon name="settings" size={14} /> {t("profile.manageInterests")}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "info" && (
              <div style={{ fontSize: 13.5, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div><b>{t("profile.memberSince")}</b> {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString(dateLocale) : "12/05/2024"}</div>
                <div><b>{t("profile.role")}</b> {userProfile?.ruolo || t("profile.guestRole")}</div>
                <div><b>{t("profile.email")}</b> {user?.email || t("profile.none")}</div>
                {userProfile?.ruolo === "EnteCertificato" && (
                  <>
                    <div><b>{t("profile.entityName")}</b> {userProfile.nomeEnte}</div>
                    <div><b>{t("profile.approvalStatus")}</b> {userProfile.approvato ? t("profile.approved") : t("profile.pending")}</div>
                  </>
                )}
                <div style={{ marginTop: 8 }}>
                  <button className="revamp-action-btn" onClick={() => setPage("impostazioni")}>
                    <Icon name="settings" size={14} /> {t("profile.editSettings")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sicurezza account: solo admin di sistema (2FA obbligatorio per loro).
            Cambio authenticator = nuovo setup QR; i codici rigenerati invalidano i vecchi. */}
        {user?.role === "system_admin" && (
          <div className="revamp-profile-card anim-in" style={{ "--accent": "var(--amber)", animationDelay: "180ms" } as React.CSSProperties}>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="shieldCheck" size={16} style={{ color: "var(--amber)" }} /> {t("twofa.securityTitle")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650 }}>{t("twofa.changeAuthenticator")}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("twofa.changeAuthenticatorSub")}</div>
                </div>
                <button className="revamp-action-btn" onClick={() => setPage("setup-2fa")}>
                  <Icon name="refresh" size={13} /> {t("twofa.changeAuthenticator")}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650 }}>{t("twofa.regenCodes")}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("twofa.regenCodesSub")}</div>
                </div>
                <button className="revamp-action-btn" disabled={regenPending} onClick={handleRegenCodes}>
                  <Icon name="key" size={13} /> {regenPending ? "…" : t("twofa.regenCodes")}
                </button>
              </div>
              {regenError && (
                <div className="revamp-status-pill danger" style={{ justifyContent: "center" }}>
                  <Icon name="warn" size={12} /> {regenError}
                </div>
              )}
              {newCodes.length > 0 && (
                <div>
                  <div className="revamp-status-pill warning" style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
                    <Icon name="warn" size={12} /> {t("twofa.regenDone")}
                  </div>
                  <div style={{
                    background: "var(--chip-fill)", padding: 12, borderRadius: 8, border: "1px solid var(--border-soft)",
                    fontFamily: "var(--mono)", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8
                  }}>
                    {newCodes.map((c, i) => <div key={i}>● {c}</div>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
