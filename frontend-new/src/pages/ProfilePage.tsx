import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getMyParticipations, leaveEvent, leaveActivity, getMe } from "../lib/api";

const PROFILE_INTERESTS = [
  { id: "outdoor",  label: "Outdoor",     icon: "bike",     color: "var(--teal)" },
  { id: "cultura",  label: "Cultura",     icon: "landmark", color: "var(--violet)" },
  { id: "musica",   label: "Musica",      icon: "music",    color: "var(--magenta)" },
  { id: "food",     label: "Food & Drink",icon: "food",     color: "var(--amber)" },
  { id: "sport",    label: "Sport",       icon: "run",      color: "var(--green)" },
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
  const [activeTab, setActiveTab] = useState("attivita");
  const [participations, setParticipations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

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
              <div className="revamp-profile-name">{user.name || "Marco Rossi"}</div>
              <div className="revamp-profile-email">{user.email || "marco.rossi@example.com"}</div>
              <div className="revamp-profile-badge">
                <Icon name="shieldCheck" size={10} style={{ color: "var(--cyan)" }} /> Autore Verificato
              </div>
            </div>
            <div className="revamp-profile-stats">
              <div className="revamp-profile-stat">
                <b>{participations.length}</b>
                <span>Partecipazioni</span>
              </div>
              <div style={{ width: 1, background: "var(--border-soft-2)" }}></div>
              <div className="revamp-profile-stat">
                <b>4.8</b>
                <span>Rating</span>
              </div>
              <div style={{ width: 1, background: "var(--border-soft-2)" }}></div>
              <div className="revamp-profile-stat">
                <b>{user?.role === "certified_entity" ? "SI" : "NO"}</b>
                <span>Ente Certificato</span>
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
              Le mie Prenotazioni
            </button>
            <button
              className={"revamp-profile-tab" + (activeTab === "interessi" ? " active" : "")}
              onClick={() => setActiveTab("interessi")}
            >
              Interessi Selezionati
            </button>
            <button
              className={"revamp-profile-tab" + (activeTab === "info" ? " active" : "")}
              onClick={() => setActiveTab("info")}
            >
              Informazioni
            </button>
          </div>

          <div className="revamp-profile-tab-body">
            {activeTab === "attivita" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {loading && (
                  <div style={{ color: "var(--text-muted)", fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>
                    Caricamento prenotazioni...
                  </div>
                )}
                {!loading && participations.length === 0 && (
                  <div style={{ color: "var(--text-muted)", fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>
                    Nessuna prenotazione attiva.
                  </div>
                )}
                {!loading && participations.map((item) => {
                  const title = item.target?.title || item.target?.titolo || "Attività/Evento";
                  const cat = item.target?.category || item.target?.categoria || "altro";
                  const color = getCatColor(cat);
                  const iconName = getCatIcon(cat);
                  const when = item.target?.dateTime || item.target?.data || "Da definire";

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
                          <Icon name="x" size={12} /> Disdici
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
                  Filtri attivi consigliati basati sui tuoi interessi personali:
                </p>
                <div className="s-interests">
                  {PROFILE_INTERESTS.filter(item => interestsList.includes(item.id) || interestsList.length === 0).map((item) => (
                    <div key={item.id} className="s-int-chip on" style={{ "--ic": item.color } as React.CSSProperties}>
                      <Icon name={item.icon} size={14} /> {item.label}
                    </div>
                  ))}
                  <button className="s-int-chip" style={{ "--ic": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("onboarding")}>
                    <Icon name="settings" size={14} /> Gestisci Interessi
                  </button>
                </div>
              </div>
            )}

            {activeTab === "info" && (
              <div style={{ fontSize: 13.5, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div><b>Membro dal:</b> {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString("it-IT") : "12 Maggio 2024"}</div>
                <div><b>Ruolo:</b> {userProfile?.ruolo || "Ospite"}</div>
                <div><b>Email:</b> {user?.email || "Nessuna"}</div>
                {userProfile?.ruolo === "EnteCertificato" && (
                  <>
                    <div><b>Nome Ente:</b> {userProfile.nomeEnte}</div>
                    <div><b>Stato Approvazione:</b> {userProfile.approvato ? "Approvato" : "In attesa"}</div>
                  </>
                )}
                <div style={{ marginTop: 8 }}>
                  <button className="revamp-action-btn" onClick={() => setPage("impostazioni")}>
                    <Icon name="settings" size={14} /> Modifica Impostazioni
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
