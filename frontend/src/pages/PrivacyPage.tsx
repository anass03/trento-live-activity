export function PrivacyPage() {
  return (
    <section className="data-page legal-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Informativa sulla privacy</h1>
          <p>Trattamento dei dati personali ai sensi del Regolamento (UE) 2016/679 (GDPR)</p>
        </div>
      </header>

      <article className="liquid-card legal-content">
        <h2>1. Titolare del trattamento</h2>
        <p>
          Il Titolare del trattamento dei dati è il Comune di Trento, in qualità di ente promotore
          della piattaforma <strong>Trento Live Activity</strong>. È possibile contattare il Titolare
          all'indirizzo <a href="mailto:privacy@comune.trento.it">privacy@comune.trento.it</a>.
        </p>

        <h2>2. Dati raccolti</h2>
        <ul>
          <li>Dati anagrafici: nome, cognome, data di nascita, codice fiscale (per i cittadini) o denominazione e PEC (per gli enti).</li>
          <li>Email, password (in forma hash bcrypt), preferenze ed interessi.</li>
          <li>Dati di partecipazione ad attività ed eventi.</li>
          <li>Posizione approssimativa, se l'utente concede l'autorizzazione, per notifiche geolocalizzate (RF40).</li>
          <li>Log tecnici di accesso e segnalazioni di moderazione.</li>
        </ul>

        <h2>3. Finalità del trattamento</h2>
        <p>
          I dati sono trattati esclusivamente per: (i) erogare il servizio; (ii) garantire la sicurezza
          dell'account (autenticazione, 2FA per amministratori); (iii) inviare notifiche e comunicazioni
          legate alle attività cui l'utente partecipa; (iv) adempiere ad obblighi normativi, inclusi
          quelli derivanti dal Digital Services Act (Regolamento UE 2022/2065) per la moderazione dei
          contenuti pubblicati dagli enti certificati.
        </p>

        <h2>4. Base giuridica</h2>
        <p>
          Il trattamento si basa sul consenso esplicito (art. 6 par. 1 lett. a GDPR) prestato in fase
          di registrazione, sull'esecuzione di un servizio richiesto (art. 6 par. 1 lett. b) e, per
          alcuni adempimenti, sull'obbligo legale (art. 6 par. 1 lett. c).
        </p>

        <h2>5. Conservazione</h2>
        <p>
          I dati sono conservati per il tempo necessario all'erogazione del servizio. In caso di
          richiesta di cancellazione (art. 17 GDPR — diritto all'oblio, RF26), i dati vengono rimossi
          entro 30 giorni, salvo obblighi di conservazione previsti dalla legge.
        </p>

        <h2>6. Diritti dell'interessato</h2>
        <p>
          L'interessato può esercitare in qualsiasi momento i diritti di accesso, rettifica,
          cancellazione, limitazione, portabilità e opposizione previsti dagli artt. 15-22 GDPR.
          È possibile farlo dalla sezione <em>Profilo &rarr; Gestione consensi</em> o scrivendo a
          <a href="mailto:privacy@comune.trento.it"> privacy@comune.trento.it</a>.
        </p>

        <h2>7. Minori</h2>
        <p>
          La registrazione è consentita solo ai soggetti che abbiano compiuto il 13° anno di età
          (art. 8 GDPR, OCL C5).
        </p>

        <h2>8. Aggiornamenti</h2>
        <p>
          La presente informativa può essere aggiornata. Le modifiche sostanziali saranno comunicate
          via email e richiederanno un nuovo consenso esplicito.
        </p>
      </article>
    </section>
  );
}
