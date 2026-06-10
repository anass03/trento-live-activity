import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

const PROFILE_INTERESTS = [
  { id: "outdoor",  label: "Outdoor",     icon: "bike",     color: "var(--teal)" },
  { id: "cultura",  label: "Cultura",     icon: "landmark", color: "var(--violet)" },
  { id: "musica",   label: "Musica",      icon: "music",    color: "var(--magenta)" },
  { id: "food",     label: "Food & Drink",icon: "food",     color: "var(--amber)" },
];

export function ProfilePage({ page, setPage, theme, setTheme, user }: any) {
  const [activeTab, setActiveTab] = useState("attivita");

  const simulatedBooked = [
    { id: "e1", title: "Visita al Castello", date: "Oggi, 16 Maggio", time: "15:30", place: "Buonconsiglio", color: "var(--violet)", icon: "landmark" },
    { id: "e2", title: "Live Music in Piazza", date: "Domani, 17 Maggio", time: "19:00", place: "Piazza Duomo", color: "var(--magenta)", icon: "music" },
  ];

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-profile-wrap">
        <div className="revamp-profile-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "60ms" }}>
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
                <b>12</b>
                <span>Partecipazioni</span>
              </div>
              <div style={{ width: 1, background: "var(--border-soft-2)" }}></div>
              <div className="revamp-profile-stat">
                <b>4.8</b>
                <span>Rating</span>
              </div>
              <div style={{ width: 1, background: "var(--border-soft-2)" }}></div>
              <div className="revamp-profile-stat">
                <b>5</b>
                <span>Attività create</span>
              </div>
            </div>
          </div>
        </div>

        <div className="revamp-profile-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "120ms" }}>
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
                {simulatedBooked.map((item) => (
                  <div key={item.id} className="area-row" style={{ padding: "12px 14px", border: "1px solid var(--border-soft-2)", borderRadius: 12, background: "var(--chip-fill)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 8, background: `color-mix(in srgb, ${item.color} 16%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${item.color} 30%, transparent)`, color: item.color,
                        display: "grid", placeItems: "center"
                      }}>
                        <Icon name={item.icon} size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>
                          <Icon name="clock" size={11} /> {item.date} · {item.time} | <Icon name="pin" size={11} /> {item.place}
                        </div>
                      </div>
                      <button className="revamp-action-btn danger" style={{ height: 34 }}>
                        <Icon name="x" size={12} /> Disdici
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "interessi" && (
              <div>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 12 }}>
                  Filtri attivi consigliati basati sui tuoi interessi personali:
                </p>
                <div className="s-interests">
                  {PROFILE_INTERESTS.map((item) => (
                    <div key={item.id} className="s-int-chip on" style={{ "--ic": item.color }}>
                      <Icon name={item.icon} size={14} /> {item.label}
                    </div>
                  ))}
                  <button className="s-int-chip" style={{ "--ic": "var(--cyan)" }} onClick={() => setPage("onboarding")}>
                    <Icon name="settings" size={14} /> Gestisci Interessi
                  </button>
                </div>
              </div>
            )}

            {activeTab === "info" && (
              <div style={{ fontSize: 13.5, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div><b>Membro dal:</b> 12 Gennaio 2024</div>
                <div><b>Città:</b> Trento, IT</div>
                <div><b>Autenticazione 2FA:</b> Attiva</div>
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
