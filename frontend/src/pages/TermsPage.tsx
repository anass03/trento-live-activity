import { useTranslation } from 'react-i18next';

export function TermsPage() {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith('en') ? <TermsEN /> : <TermsIT />;
}

function TermsIT() {
  return (
    <section className="data-page legal-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Termini di servizio</h1>
          <p>Condizioni di utilizzo della piattaforma Trento Live Activity</p>
        </div>
      </header>
      <article className="liquid-card legal-content">
        <h2>1. Oggetto</h2>
        <p>
          I presenti termini disciplinano l'uso della piattaforma <strong>Trento Live Activity</strong>,
          servizio civico promosso dal Comune di Trento per la consultazione di dati urbani in tempo
          reale e per la creazione e partecipazione ad attività sociali spontanee.
        </p>
        <h2>2. Account</h2>
        <ul>
          <li>L'iscrizione è gratuita e riservata a chi ha compiuto almeno 13 anni.</li>
          <li>L'utente è responsabile della custodia delle credenziali e di ogni attività effettuata tramite il proprio account.</li>
          <li>Gli amministratori di sistema sono tenuti ad attivare l'autenticazione a due fattori (RNF15).</li>
        </ul>
        <h2>3. Attività spontanee</h2>
        <p>
          Le attività create dai cittadini utilizzano esclusivamente valori predefiniti (categoria,
          tipologia) e non consentono testo libero (RNF22). Il numero di partecipanti deve essere
          compreso fra 2 e 50 (OCL C8) e la data di inizio non può essere nel passato (OCL C9).
        </p>
        <h2>4. Eventi certificati</h2>
        <p>
          Gli eventi pubblicati dagli enti certificati possono contenere testo libero e sono
          contrassegnati da un badge di verifica. Sono soggetti alla moderazione prevista dal
          Digital Services Act (Regolamento UE 2022/2065).
        </p>
        <h2>5. Comportamento dell'utente</h2>
        <p>
          È vietato pubblicare contenuti illeciti, offensivi, discriminatori, o tali da violare i
          diritti di terzi. È vietato impersonare altre persone o enti. La piattaforma si riserva
          il diritto di rimuovere contenuti e sospendere account in caso di violazioni.
        </p>
        <h2>6. Segnalazioni</h2>
        <p>
          Ogni utente può segnalare contenuti che ritiene inappropriati. È ammessa al massimo una
          segnalazione per utente e per evento (OCL C22). Le segnalazioni vengono gestite secondo
          il flusso di moderazione conforme al DSA.
        </p>
        <h2>7. Limitazioni di responsabilità</h2>
        <p>
          La piattaforma fornisce informazioni a scopo informativo e non garantisce la perfetta
          accuratezza dei dati IoT in tempo reale. Le attività sociali sono organizzate fra
          cittadini sotto la loro esclusiva responsabilità.
        </p>
        <h2>8. Modifiche</h2>
        <p>
          I presenti termini possono essere aggiornati. Le modifiche sostanziali richiedono un
          nuovo consenso esplicito da parte dell'utente.
        </p>
        <h2>9. Foro competente</h2>
        <p>
          Per ogni controversia è competente il Foro di Trento.
        </p>
      </article>
    </section>
  );
}

function TermsEN() {
  return (
    <section className="data-page legal-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Terms of Service</h1>
          <p>Terms of use for the Trento Live Activity platform</p>
        </div>
      </header>
      <article className="liquid-card legal-content">
        <h2>1. Subject matter</h2>
        <p>
          These terms govern the use of the <strong>Trento Live Activity</strong> platform, a civic
          service promoted by the Municipality of Trento for consulting real-time urban data and for
          creating and joining spontaneous social activities.
        </p>
        <h2>2. Account</h2>
        <ul>
          <li>Registration is free and available to anyone aged 13 or over.</li>
          <li>Users are responsible for keeping their credentials safe and for all activity carried out through their account.</li>
          <li>System administrators are required to enable two-factor authentication (RNF15).</li>
        </ul>
        <h2>3. Spontaneous activities</h2>
        <p>
          Activities created by citizens use only predefined values (category, type) and do not allow
          free text (RNF22). The number of participants must be between 2 and 50 (OCL C8) and the
          start date cannot be in the past (OCL C9).
        </p>
        <h2>4. Certified events</h2>
        <p>
          Events published by certified entities may contain free text and are marked with a
          verification badge. They are subject to moderation as required by the Digital Services Act
          (Regulation EU 2022/2065).
        </p>
        <h2>5. User conduct</h2>
        <p>
          Publishing unlawful, offensive, discriminatory or rights-infringing content is prohibited.
          Impersonating other individuals or organisations is prohibited. The platform reserves the
          right to remove content and suspend accounts in the event of violations.
        </p>
        <h2>6. Reports</h2>
        <p>
          Any user may report content they consider inappropriate. A maximum of one report per user
          per event is permitted (OCL C22). Reports are handled according to the DSA-compliant
          moderation workflow.
        </p>
        <h2>7. Limitation of liability</h2>
        <p>
          The platform provides information for informational purposes only and does not guarantee the
          perfect accuracy of real-time IoT data. Social activities are organised between citizens
          under their sole responsibility.
        </p>
        <h2>8. Changes</h2>
        <p>
          These terms may be updated. Material changes require a new explicit consent from the user.
        </p>
        <h2>9. Jurisdiction</h2>
        <p>
          Any disputes shall be subject to the exclusive jurisdiction of the Court of Trento.
        </p>
      </article>
    </section>
  );
}
