import { Header } from "../components/layout/Header";

export function PrivacyPage({ page, setPage, theme, setTheme }: any) {
  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      <div className="revamp-legal-wrap">
        <div className="revamp-legal-card">
          <h1>Informativa sulla Privacy</h1>
          <p>Ultimo aggiornamento: 16 Maggio 2024</p>
          
          <h2>1. Introduzione</h2>
          <p>
            Benvenuto su Trento Live Activity. Ci impegniamo a proteggere la tua privacy e a garantire la trasparenza del trattamento dei dati personali forniti per l'utilizzo dei nostri servizi di monitoraggio e partecipazione ad attività cittadine.
          </p>

          <h2>2. Dati Raccolti</h2>
          <p>
            Raccogliamo dati personali che fornisci volontariamente al momento dell'iscrizione o della modifica del profilo, come ad esempio:
          </p>
          <ul>
            <li>Nome, Cognome e indirizzo email per la gestione dell'account.</li>
            <li>Preferenze personali ed interessi per personalizzare la lista di eventi consigliati.</li>
            <li>Dati di posizione geografica (solo previo consenso esplicito e secondo le impostazioni dell'applicazione).</li>
          </ul>

          <h2>3. Finalità del Trattamento</h2>
          <p>
            I tuoi dati vengono trattati esclusivamente per fornirti le funzionalità principali dell'applicazione, come l'organizzazione degli itinerari e la prenotazione di eventi, nonché per monitorare in modo aggregato i flussi di affollamento cittadini a scopi statistici.
          </p>

          <h2>4. Diritti dell'Interessato</h2>
          <p>
            Ai sensi del GDPR, hai il diritto di accedere ai tuoi dati personali, richiederne la correzione, la portabilità o la cancellazione permanente, oltre ad opporti a specifici trattamenti o revocare i permessi di localizzazione in qualsiasi momento dalle impostazioni.
          </p>
        </div>
      </div>
    </div>
  );
}
