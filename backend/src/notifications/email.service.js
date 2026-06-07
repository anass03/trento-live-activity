const nodemailer = require('nodemailer');

const PLACEHOLDER_HOSTS = ['smtp.example.com', 'example.com', ''];

// HTML escape: tutti i dati utente interpolati nei template email passano
// da qui. Senza escape un ente malevolo può iniettare <a href="evil"> dentro
// le mail automatiche, sfruttando la nostra reputazione di mittente per
// phishing (security #H1).
function esc(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST || '';
  if (!host || PLACEHOLDER_HOSTS.includes(host)) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // Render free tier non supporta IPv6 outbound: Node sceglierebbe IPv6
    // dal DNS Google (smtp.gmail.com risolve sia AAAA che A) e fallirebbe
    // con `connect ENETUNREACH 2a00:1450:...`. family:4 forza socket IPv4.
    family: 4,
  });
  return transporter;
}

// Extracts the first <a href="..."> URL from the email HTML for dev logging.
function extractUrl(html) {
  const m = html.match(/href="([^"]+)"/);
  return m ? m[1] : null;
}

function fromAddress() {
  return process.env.SMTP_FROM || 'Trento Live Activity <noreply@example.com>';
}

// Railway (e molti PaaS) bloccano le porte SMTP in uscita (25/465/587): la
// connessione nodemailer va in timeout. Se la config punta a Resend usiamo la
// sua API HTTP (porta 443, non bloccata), riusando la stessa chiave re_...
// Si può anche forzare con RESEND_API_KEY.
function resendApiKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  const host = process.env.SMTP_HOST || '';
  if (host.includes('resend.com') && (process.env.SMTP_PASS || '').startsWith('re_')) {
    return process.env.SMTP_PASS;
  }
  return null;
}

async function sendViaResend(apiKey, to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text().catch(() => '')}`);
}

function logDevFallback(to, subject, html) {
  const url = extractUrl(html);
  if (url) {
    console.log(`\n[email:dev] ──────────────────────────────────`);
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Link:    ${url}`);
    console.log(`────────────────────────────────────────\n`);
  } else {
    console.log(`[email:dev] to=${to} subject="${subject}"`);
  }
}

async function send(to, subject, html) {
  if (!to) return;
  const apiKey = resendApiKey();
  const t = apiKey ? null : getTransporter();
  if (!apiKey && !t) {
    logDevFallback(to, subject, html);
    return;
  }
  try {
    if (apiKey) await sendViaResend(apiKey, to, subject, html);
    else await t.sendMail({ from: fromAddress(), to, subject, html });
    console.log(`[email] sent to=${to} subject="${subject}"`);
  } catch (e) {
    console.error(`[email] FAILED to=${to} subject="${subject}": ${e.message}`);
    // Log the link so dev can still use it manually
    const url = extractUrl(html);
    if (url) console.log(`[email:dev] Link fallback: ${url}`);
  }
}

async function sendPasswordReset(email, resetToken) {
  // Path deve combaciare con la Route nel frontend (/password-reset/:token, App.tsx).
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/password-reset/${resetToken}`;
  await send(email, 'Reimposta la tua password — Trento Live Activity', `
    <p>Hai richiesto il reset della password.</p>
    <p>Clicca sul link seguente per reimpostare la password. Il link scade tra 1 ora.</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Se non hai richiesto il reset, ignora questa email.</p>
  `);
}

async function sendActivityJoinConfirmation(email, activityTipo, data) {
  await send(email, `Iscrizione confermata: ${esc(activityTipo)}`, `
    <p>La tua partecipazione all'attività di <strong>${esc(activityTipo)}</strong> del ${esc(data)} è confermata.</p>
  `);
}

async function sendActivityNewParticipant(creatorEmail, activityTipo, participantName) {
  await send(creatorEmail, `Nuovo partecipante: ${esc(activityTipo)}`, `
    <p><strong>${esc(participantName)}</strong> si è iscritto alla tua attività di <strong>${esc(activityTipo)}</strong>.</p>
  `);
}

async function sendActivityParticipantLeft(emails, activityTipo, participantName) {
  await Promise.all(emails.map((e) => send(e, `Aggiornamento attività: ${esc(activityTipo)}`, `
    <p><strong>${esc(participantName)}</strong> ha annullato la sua partecipazione all'attività di <strong>${esc(activityTipo)}</strong>.</p>
  `)));
}

async function sendActivityUpdated(emails, activityTipo) {
  await Promise.all(emails.map((e) => send(e, `Attività modificata: ${esc(activityTipo)}`, `
    <p>L'attività di <strong>${esc(activityTipo)}</strong> a cui sei iscritto è stata modificata. Controlla i nuovi dettagli sull'app.</p>
  `)));
}

async function sendActivityCancelled(emails, activityTipo) {
  await Promise.all(emails.map((e) => send(e, `Attività annullata: ${esc(activityTipo)}`, `
    <p>L'attività di <strong>${esc(activityTipo)}</strong> a cui eri iscritto è stata annullata dal creatore.</p>
  `)));
}

async function sendReportCreated(adminEmails, eventTitolo, reportTipo) {
  await Promise.all(adminEmails.map((e) => send(e, `Nuova segnalazione: ${esc(eventTitolo)}`, `
    <p>È stata ricevuta una nuova segnalazione di tipo <strong>${esc(reportTipo)}</strong> per l'evento "<strong>${esc(eventTitolo)}</strong>".</p>
    <p>Accedi alla dashboard di moderazione per esaminarla.</p>
  `)));
}

async function sendContentRemoved(entityEmail, eventTitolo) {
  await send(entityEmail, `Contenuto rimosso: ${esc(eventTitolo)}`, `
    <p>Il tuo evento "<strong>${esc(eventTitolo)}</strong>" è stato rimosso a seguito di una segnalazione.</p>
    <p>Se ritieni che la rimozione sia avvenuta per errore, contatta il team di Trento Live Activity.</p>
  `);
}

// DSA (EU 2022/2065): inform the reporter about the outcome of their report.
async function sendReportOutcome(reporterEmail, eventTitolo, outcome) {
  const titoloEsc = esc(eventTitolo);
  const labels = {
    rimosso: ['Segnalazione accolta — evento rimosso',
      `<p>La tua segnalazione per l'evento "<strong>${titoloEsc}</strong>" è stata accolta. Il contenuto è stato rimosso dalla piattaforma.</p>`],
    archiviato: ['Segnalazione archiviata',
      `<p>La tua segnalazione per l'evento "<strong>${titoloEsc}</strong>" è stata esaminata e archiviata: non sono state riscontrate violazioni delle linee guida.</p>
       <p>Se non sei d'accordo con la decisione, puoi contattare il team di Trento Live Activity per chiedere una revisione (DSA art. 20).</p>`],
    in_lavorazione: ['Segnalazione in lavorazione',
      `<p>La tua segnalazione per l'evento "<strong>${titoloEsc}</strong>" è in fase di revisione da parte dei moderatori. Ti aggiorneremo non appena verrà conclusa.</p>`],
  };
  const entry = labels[outcome];
  if (!entry) return;
  const [subject, body] = entry;
  await send(reporterEmail, subject, body);
}

async function sendEmailVerification(email, nome, token) {
  // verifyUrl è generata server-side: token è hex random, non c'è input utente da escapare nella URL.
  // nome invece arriva dall'utente al register → escape obbligatorio.
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verifica-email?token=${token}`;
  await send(email, 'Verifica la tua email — Trento Live Activity', `
    <p>Ciao <strong>${esc(nome)}</strong>,</p>
    <p>Grazie per esserti registrato su Trento Live Activity. Clicca il link seguente per verificare la tua email e attivare l'account:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>Il link è valido per 24 ore. Se non hai richiesto la registrazione, ignora questa email.</p>
  `);
}

async function sendWelcome(email, nome) {
  await send(email, 'Email verificata — Benvenuto su Trento Live Activity!', `
    <p>Ciao <strong>${esc(nome)}</strong>,</p>
    <p>La tua email è stata verificata con successo. Ora puoi esplorare la mappa di Trento, partecipare ad attività e ricevere notifiche sugli eventi vicino a te.</p>
    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Accedi all'app</a></p>
  `);
}

async function sendEntityRegistered(email, nomeEnte) {
  await send(email, 'Richiesta di registrazione ricevuta — Trento Live Activity', `
    <p>Grazie per aver registrato <strong>${esc(nomeEnte)}</strong> su Trento Live Activity.</p>
    <p>La tua richiesta è in fase di revisione da parte del nostro team. Riceverai un'email non appena verrà esaminata.</p>
  `);
}

async function sendNewEntityRequest(adminEmails, nomeEnte, entityEmail) {
  await Promise.all(adminEmails.map((e) => send(e, `Nuova richiesta ente: ${esc(nomeEnte)}`, `
    <p>È arrivata una nuova richiesta di registrazione come ente certificato.</p>
    <ul>
      <li><strong>Ente:</strong> ${esc(nomeEnte)}</li>
      <li><strong>Email:</strong> ${esc(entityEmail)}</li>
    </ul>
    <p>Accedi alla dashboard di amministrazione per approvare o rifiutare la richiesta.</p>
  `)));
}

async function sendEntityApproved(email, nomeEnte) {
  await send(email, 'Account approvato — Trento Live Activity', `
    <p>Congratulazioni! L'account di <strong>${esc(nomeEnte)}</strong> è stato approvato.</p>
    <p>Ora puoi accedere all'app e pubblicare eventi certificati.</p>
    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login">Accedi</a></p>
  `);
}

async function sendEntityRejected(email, nomeEnte) {
  await send(email, 'Richiesta non approvata — Trento Live Activity', `
    <p>Ci dispiace comunicarti che la richiesta di registrazione di <strong>${esc(nomeEnte)}</strong> non è stata approvata.</p>
    <p>Per maggiori informazioni puoi contattare il team di Trento Live Activity.</p>
  `);
}

async function sendNewEventToInterested(emails, titolo, categoria, eventId) {
  // eventId è UUID generato dal server, non serve escape; titolo/categoria sì.
  const appUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/eventi/${eventId}`;
  await Promise.all(emails.map((e) => send(e, `Nuovo evento ${esc(categoria)}: ${esc(titolo)}`, `
    <p>È stato pubblicato un nuovo evento certificato che corrisponde ai tuoi interessi (<strong>${esc(categoria)}</strong>).</p>
    <p><strong>${esc(titolo)}</strong></p>
    <p><a href="${appUrl}">Scopri l'evento</a></p>
  `)));
}

async function sendNewActivityToInterested(emails, tipo, activityId) {
  const appUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/attivita/${activityId}`;
  await Promise.all(emails.map((e) => send(e, `Nuova attività di ${esc(tipo)} a Trento`, `
    <p>È stata pubblicata una nuova attività di <strong>${esc(tipo)}</strong> vicino a Trento che corrisponde ai tuoi interessi.</p>
    <p><a href="${appUrl}">Guarda i dettagli e partecipa</a></p>
  `)));
}

module.exports = {
  sendPasswordReset,
  sendActivityJoinConfirmation,
  sendActivityNewParticipant,
  sendActivityParticipantLeft,
  sendActivityUpdated,
  sendActivityCancelled,
  sendReportCreated,
  sendContentRemoved,
  sendReportOutcome,
  sendEmailVerification,
  sendWelcome,
  sendEntityRegistered,
  sendNewEntityRequest,
  sendEntityApproved,
  sendEntityRejected,
  sendNewEventToInterested,
  sendNewActivityToInterested,
};
