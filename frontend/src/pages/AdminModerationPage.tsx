import { useEffect, useMemo, useState } from 'react';
import { getReports, resolveReport, type Report } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';

const STATI = ['aperta', 'in lavorazione', 'risolta'] as const;
type Stato = (typeof STATI)[number];

const statoBadgeClass: Record<string, string> = {
  'aperta': 'report-stato report-stato-open',
  'in lavorazione': 'report-stato report-stato-progress',
  'risolta': 'report-stato report-stato-done',
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AdminModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'' | Stato>('aperta');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function load(stato: '' | Stato = filter, silent = false) {
    if (!silent) { setIsLoading(true); setError(null); }
    getReports(stato || undefined)
      .then((r) => setReports(r.reports || []))
      .catch((e) => { if (!silent) setError(e.message); })
      .finally(() => { if (!silent) setIsLoading(false); });
  }
  useEffect(() => { load(filter); }, [filter]);
  // Auto-aggiornamento silenzioso: niente pulsante manuale, nessun flicker.
  useAutoRefresh(() => load(filter, true), 30_000);

  async function resolve(id: string, azione: 'rimuovi' | 'archivia' | 'in_lavorazione') {
    setActionLoading(id + azione);
    try {
      const r = await resolveReport(id, azione);
      setMessage(r.message);
      load(filter);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setActionLoading(null);
    }
  }

  const tipi = useMemo(() => Array.from(new Set(reports.map((r) => r.tipo))).sort(), [reports]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { aperta: 0, 'in lavorazione': 0, risolta: 0 };
    reports.forEach((r) => { c[r.stato] = (c[r.stato] || 0) + 1; });
    return c;
  }, [reports]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (tipoFilter !== 'all' && r.tipo !== tipoFilter) return false;
      if (!q) return true;
      return (
        (r.event?.titolo || '').toLowerCase().includes(q) ||
        (r.descrizione || '').toLowerCase().includes(q) ||
        r.tipo.toLowerCase().includes(q)
      );
    });
  }, [reports, search, tipoFilter]);

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Moderazione segnalazioni</h1>
          <p>Flow conforme al Digital Services Act (Regolamento UE 2022/2065)</p>
        </div>
        {isLoading && <span className="muted-copy auto-refresh-hint">Aggiornamento…</span>}
      </header>

      <div className="moderation-stats">
        <button
          type="button"
          className={`moderation-stat ${filter === 'aperta' ? 'active' : ''}`}
          onClick={() => setFilter('aperta')}
        >
          <strong>{counts['aperta'] || 0}</strong>
          <span>Aperte</span>
        </button>
        <button
          type="button"
          className={`moderation-stat ${filter === 'in lavorazione' ? 'active' : ''}`}
          onClick={() => setFilter('in lavorazione')}
        >
          <strong>{counts['in lavorazione'] || 0}</strong>
          <span>In lavorazione</span>
        </button>
        <button
          type="button"
          className={`moderation-stat ${filter === 'risolta' ? 'active' : ''}`}
          onClick={() => setFilter('risolta')}
        >
          <strong>{counts['risolta'] || 0}</strong>
          <span>Risolte</span>
        </button>
        <button
          type="button"
          className={`moderation-stat ${filter === '' ? 'active' : ''}`}
          onClick={() => setFilter('')}
        >
          <strong>{reports.length}</strong>
          <span>Tutte</span>
        </button>
      </div>

      <div className="liquid-card filter-bar">
        <div className="filter-row">
          <label>
            <span>Cerca</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Titolo evento, motivo, descrizione…"
            />
          </label>
          <label>
            <span>Tipo segnalazione</span>
            <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
              <option value="all">Tutti i tipi</option>
              {tipi.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="state-panel liquid-panel"><p>{error}</p></div>}
      {message && <div className="state-panel liquid-panel"><p>{message}</p></div>}
      {isLoading && <div className="state-panel liquid-panel">Caricamento…</div>}
      {!isLoading && visible.length === 0 && (
        <div className="state-panel liquid-panel">
          Nessuna segnalazione {filter ? `con stato "${filter}"` : ''}{search ? ` corrispondente a "${search}"` : ''}.
        </div>
      )}

      {visible.length > 0 && (
        <div className="moderation-list">
          {visible.map((r) => {
            const isOpen = r.stato === 'aperta';
            const isProgress = r.stato === 'in lavorazione';
            const isDone = r.stato === 'risolta';
            return (
              <article className="liquid-card moderation-card" key={r.id}>
                <header className="moderation-card-header">
                  <div>
                    <span className="report-tipo">{r.tipo}</span>
                    <span className={statoBadgeClass[r.stato] || 'report-stato'}>{r.stato}</span>
                  </div>
                  <time>{formatTime(r.createdAt)}</time>
                </header>

                <h2>
                  {r.event?.id ? (
                    <a href={`/eventi/${r.event.id}`} target="_blank" rel="noreferrer">{r.event.titolo}</a>
                  ) : (
                    'Evento sconosciuto'
                  )}
                </h2>
                <p className="moderation-card-description">
                  {r.descrizione || <em>Nessuna descrizione aggiuntiva fornita dall'utente.</em>}
                </p>

                <dl className="moderation-card-meta">
                  <div><dt>ID segnalazione</dt><dd><code>{r.id.slice(0, 8)}</code></dd></div>
                  <div><dt>Segnalante</dt><dd><code>{r.userId.slice(0, 8)}</code></dd></div>
                </dl>

                {!isDone && (
                  <div className="moderation-card-actions">
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => resolve(r.id, 'in_lavorazione')}
                        disabled={actionLoading === r.id + 'in_lavorazione'}
                      >
                        Prendi in carico
                      </button>
                    )}
                    {isProgress && <span className="moderation-card-tag">In carico al moderatore</span>}
                    <button
                      type="button"
                      onClick={() => resolve(r.id, 'archivia')}
                      disabled={actionLoading === r.id + 'archivia'}
                    >
                      Archivia
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => {
                        if (window.confirm(`Rimuovere l'evento "${r.event?.titolo || ''}"? L'azione è irreversibile.`)) {
                          resolve(r.id, 'rimuovi');
                        }
                      }}
                      disabled={actionLoading === r.id + 'rimuovi'}
                    >
                      Rimuovi evento
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
