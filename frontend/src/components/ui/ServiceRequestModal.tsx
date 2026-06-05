import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { POIMapPicker } from '../map/POIMapPicker';
import {
  submitServiceRequest,
  SUBCATEGORIES_BY_CATEGORY,
  type ServiceRequestCategory,
  type ServiceRequestSubcategory,
} from '../../lib/api';
import { GeocodedLocation } from './GeocodedLocation';

const CATEGORIES: ServiceRequestCategory[] = [
  'parcheggio_auto', 'parcheggio_bici', 'sport', 'studio',
  'verde', 'cultura', 'ciclismo', 'altro',
];

interface Props { onClose: () => void }

export function ServiceRequestModal({ onClose }: Props) {
  const { t } = useTranslation();
  const [categoria, setCategoria] = useState<ServiceRequestCategory | null>(null);
  const [sottocategoria, setSottocategoria] = useState<ServiceRequestSubcategory | null>(null);
  const [coords, setCoords] = useState<{ latitudine: number; longitudine: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When macro category changes, reset subcategory
  function handleCategorySelect(cat: ServiceRequestCategory) {
    setCategoria(cat);
    setSottocategoria(null);
  }

  const availableSubcats = categoria ? SUBCATEGORIES_BY_CATEGORY[categoria] : [];
  const hasSubcats = availableSubcats.length > 0;

  async function handleSubmit() {
    if (!categoria || !coords) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitServiceRequest({
        categoria,
        sottocategoria: sottocategoria ?? null,
        latitudine: coords.latitudine,
        longitudine: coords.longitudine,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('serviceRequest.error'));
    } finally {
      setSubmitting(false);
    }
  }

  // Delegate to the existing POIMapPicker modal already used in the whole app
  if (showMap) {
    return (
      <POIMapPicker
        initial={coords ?? undefined}
        onConfirm={(c) => { setCoords(c); setShowMap(false); }}
        onCancel={() => setShowMap(false)}
      />
    );
  }

  return (
    <div className="poi-map-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="poi-map-picker liquid-card"
        style={{ maxWidth: 480 }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{t('serviceRequest.title')}</h2>
          <p>{t('serviceRequest.hint')}</p>
        </header>

        {success ? (
          <div style={{ display: 'grid', gap: 16, padding: '8px 0' }}>
            <p style={{ color: 'var(--color-success)', fontWeight: 720 }}>
              {t('serviceRequest.success')}
            </p>
            <div className="filter-actions">
              <button type="button" className="primary-button" onClick={onClose}>{t('common.close')}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* Step 1: Macro category */}
            <div style={{ display: 'grid', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 780, color: 'var(--color-text-secondary)' }}>
                {t('serviceRequest.categoryLabel')}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={categoria === cat ? 'primary-button' : 'ghost-button'}
                    style={{ minHeight: 34, padding: '0 12px', fontSize: 13 }}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {t(`serviceRequest.categories.${cat}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Subcategory — progressive reveal, only when category has options */}
            {categoria && hasSubcats && (
              <div style={{ display: 'grid', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 780, color: 'var(--color-text-secondary)' }}>
                  {t('serviceRequest.subcategoryLabel')}
                  <span className="muted-copy" style={{ fontWeight: 400, marginLeft: 6 }}>
                    {t('serviceRequest.subcategoryOptional')}
                  </span>
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {availableSubcats.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      className={sottocategoria === sub ? 'primary-button' : 'ghost-button'}
                      style={{ minHeight: 32, padding: '0 10px', fontSize: 12 }}
                      onClick={() => setSottocategoria(sottocategoria === sub ? null : sub)}
                    >
                      {t(`serviceRequest.subcategories.${sub}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Location — shown after category is chosen */}
            {categoria && (
              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 780, color: 'var(--color-text-secondary)' }}>
                  {t('serviceRequest.locationLabel')}
                </span>
                {coords ? (
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    <GeocodedLocation value={`${coords.latitudine.toFixed(4)}, ${coords.longitudine.toFixed(4)}`} />
                  </span>
                ) : (
                  <em className="muted-copy" style={{ fontSize: 13 }}>{t('serviceRequest.noLocation')}</em>
                )}
                <div>
                  <button type="button" className="ghost-button" onClick={() => setShowMap(true)}>
                    {coords ? t('serviceRequest.changeLocation') : t('serviceRequest.chooseLocation')}
                  </button>
                </div>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}

            <div className="filter-actions">
              <button type="button" onClick={onClose}>{t('common.cancel')}</button>
              <button
                type="button"
                className="primary-button"
                disabled={!categoria || !coords || submitting}
                onClick={() => { void handleSubmit(); }}
              >
                {submitting ? t('serviceRequest.submitting') : t('serviceRequest.submit')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
