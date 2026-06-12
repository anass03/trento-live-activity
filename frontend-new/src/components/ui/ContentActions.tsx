import React, { useState } from "react";
import { Icon } from "./Icon";
import { GoogleBrandIcon, AppleBrandIcon } from "./BrandIcons";
import {
  googleCalendarUrl,
  getEventCalendarUrl,
  getActivityCalendarUrl,
  reportEvent,
  reportActivity,
} from "../../lib/api";

const REPORT_TYPES = [
  { id: "contenuto_inappropriato", label: "Contenuto inappropriato" },
  { id: "spam", label: "Spam" },
  { id: "disinformazione", label: "Disinformazione" },
  { id: "contenuto_offensivo", label: "Contenuto offensivo" },
  { id: "altro", label: "Altro" },
];

interface ContentActionsProps {
  kind: "event" | "activity";
  id: string;
  title: string;
  startIso?: string | null;
  location?: string | null;
  accent?: string;
  /* role corrente: i guest non possono segnalare (il backend richiede auth) */
  userRole?: string;
  onRequireLogin?: () => void;
}

/* Azioni comuni a eventi e attività: aggiunta al calendario (Google apre
   direttamente il template web, Apple scarica l'.ics che su macOS/iOS apre
   Calendario in automatico) e segnalazione alla moderazione. */
export function ContentActions({ kind, id, title, startIso, location, accent = "var(--magenta)", userRole, onRequireLogin }: ContentActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTipo, setReportTipo] = useState(REPORT_TYPES[0].id);
  const [reportDesc, setReportDesc] = useState("");
  const [reportState, setReportState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [reportError, setReportError] = useState("");

  const icsUrl = kind === "event" ? getEventCalendarUrl(id) : getActivityCalendarUrl(id);

  const openGoogle = () => {
    if (!startIso) return;
    window.open(googleCalendarUrl(title, startIso, location), "_blank", "noopener");
  };
  const openApple = () => {
    window.location.href = icsUrl;
  };

  const toggleReport = () => {
    if (userRole === "anonymous") {
      onRequireLogin && onRequireLogin();
      return;
    }
    setReportOpen((v) => !v);
  };

  const submitReport = async () => {
    setReportState("sending");
    setReportError("");
    try {
      if (kind === "event") await reportEvent(id, reportTipo, reportDesc || undefined);
      else await reportActivity(id, reportTipo, reportDesc || undefined);
      setReportState("done");
    } catch (err: any) {
      setReportState("error");
      setReportError(err?.code === "ALREADY_REPORTED"
        ? "Hai già segnalato questo contenuto."
        : (err?.message || "Invio non riuscito. Riprova."));
    }
  };

  const ghostBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "9px 14px", borderRadius: 10,
    background: "transparent", border: "1px solid var(--border-soft, rgba(127,127,127,0.25))",
    color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {startIso && (
          <button style={ghostBtn} onClick={openGoogle} title="Apri Google Calendar">
            <GoogleBrandIcon size={14} /> Google Calendar
          </button>
        )}
        <button style={ghostBtn} onClick={openApple} title="Scarica .ics (si apre in Apple Calendar)">
          <AppleBrandIcon size={14} /> Apple Calendar
        </button>
        {/* Segnalare è riservato ai cittadini (gli enti sono parte in causa,
            gli admin moderano direttamente): il backend rifiuta gli altri. */}
        {(userRole === "registered_user" || userRole === "anonymous") && (
          <button
            style={{ ...ghostBtn, marginLeft: "auto", color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 35%, transparent)" }}
            onClick={toggleReport}
          >
            <Icon name="warn" size={14} /> Segnala
          </button>
        )}
      </div>

      {reportOpen && (
        <div style={{
          marginTop: 12, padding: 14, borderRadius: 12,
          border: "1px solid var(--border-soft, rgba(127,127,127,0.25))",
          background: "color-mix(in srgb, var(--red) 4%, transparent)",
        }}>
          {reportState === "done" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: 13.5, fontWeight: 600 }}>
              <Icon name="check" size={15} /> Segnalazione inviata. Gli amministratori la esamineranno al più presto.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                Segnala {kind === "event" ? "questo evento" : "questa attività"}
              </div>
              <select
                value={reportTipo}
                onChange={(e) => setReportTipo(e.target.value)}
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, marginBottom: 8, background: "var(--bg-input, transparent)", color: "var(--text-primary)", border: "1px solid var(--border-soft, rgba(127,127,127,0.25))", fontSize: 13 }}
              >
                {REPORT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Descrivi il problema (facoltativo)"
                maxLength={2000}
                rows={3}
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, marginBottom: 10, background: "var(--bg-input, transparent)", color: "var(--text-primary)", border: "1px solid var(--border-soft, rgba(127,127,127,0.25))", fontSize: 13, resize: "vertical" }}
              />
              {reportState === "error" && (
                <div style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 8 }}>{reportError}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button style={ghostBtn} onClick={() => setReportOpen(false)}>Annulla</button>
                <button
                  className="revamp-form-btn"
                  style={{ "--accent": accent, width: "auto", padding: "9px 16px" } as React.CSSProperties}
                  disabled={reportState === "sending"}
                  onClick={submitReport}
                >
                  {reportState === "sending" ? "Invio…" : "Invia segnalazione"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
