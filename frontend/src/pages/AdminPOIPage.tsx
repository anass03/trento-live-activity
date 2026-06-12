import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { POIMapPicker } from '../components/map/POIMapPicker';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';
import { createPOI, deletePOI, getPOIs, updatePOI, type POI } from '../lib/api';

const EMPTY: Partial<POI> = { nome: '', latitudine: undefined, longitudine: undefined, capacitaMax: 100, statoAffollamento: 'verde', tipo: '', descrizione: '' };

export function AdminPOIPage() {
  const { t } = useTranslation();
  const [pois, setPois] = useState<POI[]>([]);
  const [editing, setEditing] = useState<Partial<POI>>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  function load() {
    getPOIs().then(setPois).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    if (typeof editing.latitudine !== 'number' || typeof editing.longitudine !== 'number') {
      setError(t('admin.poi.positionRequired'));
      return;
    }
    try {
      if (editing.id) {
        await updatePOI(editing.id, editing);
        setMessage(t('admin.poi.updated'));
      } else {
        await createPOI(editing);
        setMessage(t('admin.poi.created'));
      }
      setEditing(EMPTY);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('admin.poi.deleteConfirm'))) return;
    try { await deletePOI(id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
  }

  const crowdingLabel: Record<string, string> = {
    verde: t('admin.poi.crowdingLow'),
    giallo: t('admin.poi.crowdingMedium'),
    rosso: t('admin.poi.crowdingHigh'),
  };

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('admin.poi.title')}</h1>
          <p>{t('admin.poi.subtitle')}</p>
        </div>
      </header>

      <form className="auth-form liquid-card" onSubmit={handleSubmit}>
        <h2>{editing.id ? t('admin.poi.editTitle') : t('admin.poi.new')}</h2>
        <label>
          <span>{t('common.name')}</span>
          <input type="text" value={editing.nome || ''} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} required />
        </label>
        <div className="poi-location-row">
          <div className="poi-location-info">
            <span className="poi-location-label">{t('admin.poi.mapPosition')}</span>
            {typeof editing.latitudine === 'number' && typeof editing.longitudine === 'number' ? (
              <GeocodedLocation value={(editing as POI).indirizzo || `${editing.latitudine.toFixed(4)}, ${editing.longitudine.toFixed(4)}`} />
            ) : (
              <em>{t('admin.poi.noPosition')}</em>
            )}
          </div>
          <button type="button" className="primary-button" onClick={() => setShowPicker(true)}>
            {typeof editing.latitudine === 'number' ? t('admin.poi.changePosition') : t('admin.poi.choosePosition')}
          </button>
        </div>
        <div className="filter-row">
          <label>
            <span>{t('admin.poi.maxCapacity')}</span>
            <input type="number" min="1" value={editing.capacitaMax ?? ''} onChange={(e) => setEditing({ ...editing, capacitaMax: Number(e.target.value) })} required />
          </label>
          <label>
            <span>{t('admin.poi.crowding')}</span>
            <select value={editing.statoAffollamento || 'verde'} onChange={(e) => setEditing({ ...editing, statoAffollamento: e.target.value })}>
              <option value="verde">{t('admin.poi.crowdingLow')}</option>
              <option value="giallo">{t('admin.poi.crowdingMedium')}</option>
              <option value="rosso">{t('admin.poi.crowdingHigh')}</option>
            </select>
          </label>
          <label>
            <span>{t('admin.poi.type')}</span>
            <input type="text" value={editing.tipo || ''} onChange={(e) => setEditing({ ...editing, tipo: e.target.value })} placeholder={t('admin.poi.typePlaceholder')} />
          </label>
        </div>
        <label>
          <span>{t('admin.poi.description')}</span>
          <textarea value={editing.descrizione || ''} onChange={(e) => setEditing({ ...editing, descrizione: e.target.value })} rows={2} />
        </label>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <div className="filter-actions">
          <button type="submit" className="primary-button">{editing.id ? t('admin.poi.save') : t('admin.poi.create')}</button>
          {editing.id && <button type="button" onClick={() => setEditing(EMPTY)}>{t('common.cancel')}</button>}
        </div>
      </form>

      {showPicker && (
        <POIMapPicker
          initial={{ latitudine: editing.latitudine, longitudine: editing.longitudine }}
          onCancel={() => setShowPicker(false)}
          onConfirm={(coords) => {
            setEditing({ ...editing, ...coords, indirizzo: undefined });
            setShowPicker(false);
          }}
        />
      )}

      <div className="liquid-card">
        <h2>{t('admin.poi.existing', { count: pois.length })}</h2>
        <table className="stats-table">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('admin.poi.position')}</th>
              <th>{t('admin.poi.capacity')}</th>
              <th>{t('admin.poi.crowding')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pois.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.indirizzo || `${p.latitudine.toFixed(4)}, ${p.longitudine.toFixed(4)}`}</td>
                <td>{p.capacitaMax}</td>
                <td><span className={`crowding-dot ${p.statoAffollamento}`} />{crowdingLabel[p.statoAffollamento] ?? p.statoAffollamento}</td>
                <td>
                  <button type="button" onClick={() => setEditing(p)}>{t('common.edit')}</button>
                  <button type="button" className="danger-button" onClick={() => handleDelete(p.id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
