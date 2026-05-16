import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, type DashboardStats } from '../lib/api';

const CROWD_LABEL: Record<string, { label: string; tone: 'green' | 'yellow' | 'red' }> = {
  verde: { label: 'Basso', tone: 'green' },
  giallo: { label: 'Medio', tone: 'yellow' },
  rosso: { label: 'Elevato', tone: 'red' },
};

const TIPO_LABEL: Record<string, string> = {
  parcheggio: 'Parcheggio',
  universita: 'Università',
  stazione: 'Trasporti',
  museo: 'Museo',
  parco: 'Parco',
  piazza: 'Piazza',
  biblioteca: 'Biblioteca',
};

export function ComuneDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    setError(null);
    getDashboardStats()
      .then((next) => setStats(next as DashboardStats))
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore'))
      .finally(() => setIsLoading(false));
  }
  useEffect(load, []);

  return (
    <section className="data-page comune-page comune-dashboard-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Dashboard Comune</h1>
          <p>
            Statistiche aggregate utili a migliorare la città. <strong>Nessun dato personale</strong>:
            non vengono mai mostrate informazioni sui singoli cittadini o conteggi totali di utenti.
          </p>
        </div>
        <button type="button" className="refresh-button" onClick={load} disabled={isLoading}>
          {isLoading ? 'Aggiornamento…' : 'Aggiorna'}
        </button>
      </header>

      {isLoading && <div className="state-panel liquid-panel">Caricamento dati aggregati…</div>}
      {error && (
        <div className="state-panel liquid-panel">
          <p>{error}</p>
          <button type="button" onClick={load}>Riprova</button>
        </div>
      )}

      {!isLoading && !error && stats && (
        <>
          <div className="kpi-grid">
            <article className="kpi liquid-card">
              <span className="kpi-label">Attività attive</span>
              <strong className="kpi-value">{stats.totalActivities}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">Eventi certificati</span>
              <strong className="kpi-value">{stats.totalEvents}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">Punti di interesse</span>
              <strong className="kpi-value">{stats.totalPOIs}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">Partecipazioni</span>
              <strong className="kpi-value">{stats.totalParticipations}</strong>
            </article>
          </div>

          <div className="comune-overview-grid">
            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">Affollamento</span>
                <strong>Top 10 POI per affollamento</strong>
              </div>
              {(stats.topCrowdedPOIs || []).length === 0 ? (
                <p className="muted-copy">Nessun dato POI disponibile.</p>
              ) : (
                <ol className="comune-poi-list">
                  {(stats.topCrowdedPOIs || []).map((p, i) => {
                    const c = CROWD_LABEL[p.statoAffollamento] || { label: p.statoAffollamento, tone: 'green' as const };
                    return (
                      <li key={p.id}>
                        <span className="comune-rank">#{i + 1}</span>
                        <span className="comune-poi-name">{p.nome}</span>
                        <span className="muted-copy">{TIPO_LABEL[p.tipo || ''] || p.tipo || '—'}</span>
                        <span className={`crowding-dot ${p.statoAffollamento}`} aria-hidden="true" />
                        <span><strong>{c.label}</strong></span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">Attività spontanee</span>
                <strong>Categorie più frequenti</strong>
              </div>
              {stats.activitiesByType.length === 0 ? (
                <p className="muted-copy">Nessuna attività registrata.</p>
              ) : (
                <ul className="comune-bar-list">
                  {stats.activitiesByType
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((r) => {
                      const max = Math.max(...stats.activitiesByType.map((x) => x.count), 1);
                      return (
                        <li key={r.tipo}>
                          <span>{r.tipo}</span>
                          <div className="comune-bar">
                            <span className="comune-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
                          </div>
                          <strong>{r.count}</strong>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>

            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">Eventi certificati</span>
                <strong>Categorie</strong>
              </div>
              {(stats.eventsByCategory || []).length === 0 ? (
                <p className="muted-copy">Nessun evento registrato.</p>
              ) : (
                <ul className="comune-bar-list">
                  {(stats.eventsByCategory || [])
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((r) => {
                      const max = Math.max(...(stats.eventsByCategory || []).map((x) => x.count), 1);
                      return (
                        <li key={r.categoria}>
                          <span>{r.categoria}</span>
                          <div className="comune-bar">
                            <span className="comune-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
                          </div>
                          <strong>{r.count}</strong>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>

            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">Azioni</span>
                <strong>Strumenti</strong>
              </div>
              <div className="quick-action-list">
                <Link className="primary-button" to="/comune/statistiche">Statistiche dettagliate</Link>
                <Link className="primary-button" to="/comune/export">Esporta CSV / PDF</Link>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
