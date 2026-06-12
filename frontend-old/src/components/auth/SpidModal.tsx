import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { spidLoginStub } from '../../lib/api';

interface Props { open: boolean; onClose: () => void }

// SPID demo: in produzione qui ci sarebbe la lista dei provider SPID con redirect
// al loro IdP. Qui simula il callback finale chiedendo i campi minimi.
export function SpidModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [spidId, setSpidId] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [ufficio, setUfficio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await spidLoginStub({ spidId, nome, cognome, email, ufficio });
      navigate('/');
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : t('auth.spidError'));
    } finally { setLoading(false); }
  }

  return (
    <div className="activity-popup-backdrop" role="presentation" onClick={onClose}>
      <article className="activity-popup spid-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="activity-popup-close" type="button" onClick={onClose} aria-label={t('common.close')}>×</button>
        <div className="spid-modal-header">
          <span className="spid-logo-big" aria-hidden="true">SP</span>
          <div>
            <h2>{t('auth.spidTitle')}</h2>
            <p>{t('auth.spidDemo')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="spid-form">
          <label>
            <span>{t('profile.spidId')}</span>
            <input value={spidId} onChange={(e) => setSpidId(e.target.value)} required placeholder="SPID-TN-XXXX" />
          </label>
          <div className="filter-row">
            <label>
              <span>{t('common.name')}</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </label>
            <label>
              <span>{t('common.lastName')}</span>
              <input value={cognome} onChange={(e) => setCognome(e.target.value)} required />
            </label>
          </div>
          <label>
            <span>{t('auth.institutionalEmail')}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nome.cognome@comune.trento.it" />
          </label>
          <label>
            <span>{t('profile.office')}</span>
            <input value={ufficio} onChange={(e) => setUfficio(e.target.value)} placeholder="Ufficio statistica" />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="social-button spid" disabled={loading}>
            {loading ? t('auth.spidLoading') : t('auth.spidConfirm')}
          </button>
        </form>
      </article>
    </div>
  );
}
