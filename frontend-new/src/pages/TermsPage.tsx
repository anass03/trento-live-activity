import { Header } from "../components/layout/Header";

export function TermsPage({ page, setPage, theme, setTheme }: any) {
  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      <div className="revamp-legal-wrap">
        <div className="revamp-legal-card">
          <h1>Termini di Servizio</h1>
          <p>Ultimo aggiornamento: 16 Maggio 2024</p>

          <h2>1. Accettazione dei Termini</h2>
          <p>
            L'accesso e l'utilizzo del portale Trento Live Activity sono soggetti all'accettazione e alla conformità con i presenti Termini di Servizio. Se non accetti tali termini, sei invitato a non utilizzare l'applicazione.
          </p>

          <h2>2. Registrazione e Sicurezza</h2>
          <p>
            Gli utenti registrati sono responsabili della riservatezza delle proprie credenziali di accesso. Qualsiasi attività effettuata sotto il proprio account sarà considerata di esclusiva responsabilità dell'utente.
          </p>

          <h2>3. Comportamento dell'Utente</h2>
          <p>
            È severamente vietato caricare o pubblicare contenuti illeciti, diffamatori o ingannevoli. Gli enti certificati si impegnano a fornire informazioni veritiere sulle attività ed eventi proposti alla cittadinanza.
          </p>

          <h2>4. Limitazione di Responsabilità</h2>
          <p>
            Trento Live Activity fornisce informazioni in tempo reale basate su dati di sensori, flussi di rete e contributi della community. Pur impegnandoci per garantire la massima accuratezza, non garantiamo l'assenza totale di errori o variazioni repentine dei flussi di affollamento o del meteo.
          </p>
        </div>
      </div>
    </div>
  );
}
