import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createActivity, getToken, type MapMarker } from '../../lib/api';
import type { AppUser } from '../../data/mockUser';

const ACTIVITY_TYPES = ['sport', 'cultura', 'musica', 'studio'] as const;

interface PoiForm {
  tipo: string;
  data: string;
  orarioInizio: string;
  orarioFine: string;
  maxPartecipanti: number;
}

const defaultForm = (): PoiForm => ({ tipo: 'sport', data: '', orarioInizio: '', orarioFine: '', maxPartecipanti: 10 });

const statusLabel = { green: 'Basso affollamento', yellow: 'Medio affollamento', red: 'Alto affollamento' };
const typeLabel = { poi: 'POI', activity: 'Attività', event: 'Evento' };

const TRENTO_BOUNDS = {
  minLat: 46.058,
  maxLat: 46.08,
  minLng: 11.105,
  maxLng: 11.13,
};

function clamp(value: number) {
  return Math.min(92, Math.max(8, value));
}

function markerPosition(marker: MapMarker) {
  const x = ((marker.longitude - TRENTO_BOUNDS.minLng) / (TRENTO_BOUNDS.maxLng - TRENTO_BOUNDS.minLng)) * 100;
  const y = (1 - ((marker.latitude - TRENTO_BOUNDS.minLat) / (TRENTO_BOUNDS.maxLat - TRENTO_BOUNDS.minLat))) * 100;
  return { left: `${clamp(x)}%`, top: `${clamp(y)}%` };
}

function detailPath(marker: MapMarker): string | null {
  if (marker.type === 'activity') return `/attivita/${marker.sourceId}`;
  if (marker.type === 'event') return `/eventi/${marker.sourceId}`;
  return null;
}

export function MapCanvas({ markers, user }: { markers: MapMarker[]; user?: AppUser }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<MapMarker | null>(null);
  const [pinned, setPinned] = useState<MapMarker | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PoiForm>(defaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isLoggedIn = !!getToken() && user?.role !== 'anonymous';

  useEffect(() => {
    if (pinned && !markers.some((m) => m.id === pinned.id)) setPinned(null);
  }, [markers, pinned]);

  // Reset form when pinned marker changes
  useEffect(() => {
    setShowForm(false);
    setForm(defaultForm());
    setFormMsg(null);
  }, [pinned?.id]);

  const displayed = pinned ?? hovered;

  function handleMarkerClick(marker: MapMarker) {
    setPinned((prev) => (prev?.id === marker.id ? null : marker));
  }

  function handleCardClick(e: MouseEvent) {
    if (!displayed || showForm) return;
    const path = detailPath(displayed);
    if (path) navigate(path);
  }

  async function handleCreateActivity(e: FormEvent) {
    e.preventDefault();
    if (!pinned) return;
    setSubmitting(true);
    setFormMsg(null);
    try {
      await createActivity({ ...form, poiId: pinned.sourceId ?? undefined });
      setFormMsg({ ok: true, text: 'Attività creata!' });
      setShowForm(false);
      setForm(defaultForm());
    } catch (err) {
      setFormMsg({ ok: false, text: err instanceof Error ? err.message : 'Errore nella creazione.' });
    } finally {
      setSubmitting(false);
    }
  }

  const showNavigate = !showForm && displayed && detailPath(displayed);

  return (
    <section className="map-area glass-panel">
      <div className="map-grid" aria-label="Placeholder mappa interattiva">
        {markers.map((marker) => (
          <button
            key={marker.id}
            className={`marker marker-${marker.crowdingStatus}${pinned?.id === marker.id ? ' marker-pinned' : ''}`}
            style={markerPosition(marker)}
            onMouseEnter={() => setHovered(marker)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleMarkerClick(marker)}
          >
            <span>{marker.title}</span>
            {marker.isCertified && <small className="badge">Verificato</small>}
          </button>
        ))}
      </div>

      {displayed && (
        <aside
          className="marker-card glass-card"
          style={{ cursor: showNavigate ? 'pointer' : 'default', overflow: 'auto', maxHeight: '80vh' }}
          onClick={handleCardClick}
          title={showNavigate ? 'Clicca per aprire i dettagli' : undefined}
        >
          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            {typeLabel[displayed.type]}{pinned ? ' · fissato' : ''}
          </p>
          <h3 style={{ margin: '0 0 6px' }}>{displayed.title}</h3>
          <p style={{ margin: '0 0 4px', fontSize: 13 }}>Affollamento: {statusLabel[displayed.crowdingStatus]}</p>
          {displayed.isCertified && <p className="badge" style={{ margin: 0 }}>Evento certificato</p>}
          {showNavigate && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-primary)' }}>Apri dettagli →</p>
          )}

          {displayed.type === 'poi' && isLoggedIn && pinned && (
            <div onClick={(e) => e.stopPropagation()}>
              {!showForm ? (
                <button
                  className="primary-button"
                  style={{ marginTop: 10, width: '100%', fontSize: 13 }}
                  onClick={() => setShowForm(true)}
                  type="button"
                >
                  ➕ Crea attività qui
                </button>
              ) : (
                <form onSubmit={handleCreateActivity} style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <label style={{ fontSize: 12, display: 'grid', gap: 3 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Tipo</span>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)', borderRadius: 8, padding: '6px 8px', font: 'inherit', fontSize: 13 }}
                      required
                    >
                      {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, display: 'grid', gap: 3 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Data</span>
                    <input
                      type="date"
                      value={form.data}
                      onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)', borderRadius: 8, padding: '6px 8px', font: 'inherit', fontSize: 13 }}
                      required
                    />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <label style={{ fontSize: 12, display: 'grid', gap: 3 }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Inizio</span>
                      <input
                        type="time"
                        value={form.orarioInizio}
                        onChange={(e) => setForm((f) => ({ ...f, orarioInizio: e.target.value }))}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)', borderRadius: 8, padding: '6px 8px', font: 'inherit', fontSize: 13 }}
                        required
                      />
                    </label>
                    <label style={{ fontSize: 12, display: 'grid', gap: 3 }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Fine</span>
                      <input
                        type="time"
                        value={form.orarioFine}
                        onChange={(e) => setForm((f) => ({ ...f, orarioFine: e.target.value }))}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)', borderRadius: 8, padding: '6px 8px', font: 'inherit', fontSize: 13 }}
                        required
                      />
                    </label>
                  </div>
                  <label style={{ fontSize: 12, display: 'grid', gap: 3 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Max partecipanti (2–50)</span>
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={form.maxPartecipanti}
                      onChange={(e) => setForm((f) => ({ ...f, maxPartecipanti: Number(e.target.value) }))}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)', borderRadius: 8, padding: '6px 8px', font: 'inherit', fontSize: 13 }}
                      required
                    />
                  </label>
                  {formMsg && (
                    <p style={{ margin: 0, fontSize: 12, color: formMsg.ok ? '#d2ffe6' : '#ffd0d0' }}>{formMsg.text}</p>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="primary-button" type="submit" disabled={submitting} style={{ flex: 1, fontSize: 13 }}>
                      {submitting ? '...' : 'Crea'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setFormMsg(null); }}
                      style={{ background: 'transparent', border: '1px solid var(--color-glass-border)', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
