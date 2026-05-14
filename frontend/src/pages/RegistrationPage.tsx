import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, registerEntity } from '../lib/api';

type Mode = 'user' | 'entity';

export function RegistrationPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('user');
  const [form, setForm] = useState({
    email: '', password: '', nome: '', cognome: '', dataNascita: '', nomeEnte: '',
  });
  const [consents, setConsents] = useState({ privacy_policy: false, terms_of_service: false, marketing: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (mode === 'user') {
        if (!consents.privacy_policy || !consents.terms_of_service) {
          throw new Error('Devi accettare privacy policy e termini di servizio per registrarti');
        }
        await register({
          email: form.email, password: form.password, nome: form.nome,
          cognome: form.cognome, dataNascita: form.dataNascita,
          consents,
        });
        navigate('/');
        window.location.reload();
      } else {
        const result = await registerEntity({
          email: form.email, password: form.password, nomeEnte: form.nomeEnte,
          nome: form.nome, cognome: form.cognome,
        });
        setSuccess(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante la registrazione');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-form liquid-card" onSubmit={handleSubmit}>
        <h1>Registrazione</h1>

        <div className="mode-switch">
          <button type="button" className={mode === 'user' ? 'active' : ''} onClick={() => setMode('user')}>Cittadino</button>
          <button type="button" className={mode === 'entity' ? 'active' : ''} onClick={() => setMode('entity')}>Ente certificato</button>
        </div>

        {mode === 'entity' && (
          <p className="hint">La richiesta sarà sottoposta all'approvazione di un amministratore di sistema.</p>
        )}

        <label>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </label>
        <label>
          <span>Password (min 8 caratteri)</span>
          <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} minLength={8} required />
        </label>

        {mode === 'user' ? (
          <>
            <label>
              <span>Nome</span>
              <input type="text" value={form.nome} onChange={(e) => update('nome', e.target.value)} required />
            </label>
            <label>
              <span>Cognome</span>
              <input type="text" value={form.cognome} onChange={(e) => update('cognome', e.target.value)} required />
            </label>
            <label>
              <span>Data di nascita</span>
              <input type="date" value={form.dataNascita} onChange={(e) => update('dataNascita', e.target.value)} required />
              <small>Devi avere almeno 13 anni (GDPR art. 8)</small>
            </label>

            <fieldset className="consents">
              <legend>Consensi (GDPR)</legend>
              <label className="checkbox">
                <input type="checkbox" checked={consents.privacy_policy} onChange={(e) => setConsents({ ...consents, privacy_policy: e.target.checked })} required />
                <span>Accetto la privacy policy *</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={consents.terms_of_service} onChange={(e) => setConsents({ ...consents, terms_of_service: e.target.checked })} required />
                <span>Accetto i termini di servizio *</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={consents.marketing} onChange={(e) => setConsents({ ...consents, marketing: e.target.checked })} />
                <span>Accetto di ricevere comunicazioni di marketing (facoltativo)</span>
              </label>
            </fieldset>
          </>
        ) : (
          <>
            <label>
              <span>Nome dell'ente</span>
              <input type="text" value={form.nomeEnte} onChange={(e) => update('nomeEnte', e.target.value)} required />
            </label>
            <label>
              <span>Referente — Nome</span>
              <input type="text" value={form.nome} onChange={(e) => update('nome', e.target.value)} />
            </label>
            <label>
              <span>Referente — Cognome</span>
              <input type="text" value={form.cognome} onChange={(e) => update('cognome', e.target.value)} />
            </label>
          </>
        )}

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Registrazione in corso...' : 'Registrati'}
        </button>

        <div className="auth-links">
          <Link to="/login">Hai già un account? Accedi</Link>
        </div>
      </form>
    </section>
  );
}
