const nodemailer = require('nodemailer');

const PLACEHOLDER_HOSTS = ['smtp.example.com', 'example.com', ''];

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST || '';
  if (!host || PLACEHOLDER_HOSTS.includes(host)) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// Extracts the first <a href="..."> URL from the email HTML for dev logging.
function extractUrl(html) {
  const m = html.match(/href="([^"]+)"/);
  return m ? m[1] : null;
}

async function send(to, subject, html) {
  if (!to) return;
  const t = getTransporter();
  if (!t) {
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
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || 'Trento Live Activity <noreply@example.com>',
      to, subject, html,
    });
    console.log(`[email] sent to=${to} subject="${subject}"`);
  } catch (e) {
    console.error(`[email] FAILED to=${to} subject="${subject}": ${e.message}`);
    // Log the link so dev can still use it manually
    const url = extractUrl(html);
    if (url) console.log(`[email:dev] Link fallback: ${url}`);
  }
}

async function sendPasswordReset(email, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  await send(email, 'Reimposta la tua password — Trento Live Activity', `
    <p>Hai richiesto il reset della password.</p>
    <p>Clicca sul link seguente per reimpostare la password. Il link scade tra 1 ora.</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Se non hai richiesto il reset, ignora questa email.</p>
  `);
}

async function sendActivityJoinConfirmation(email, activityTipo, data) {
  await send(email, `Iscrizione confermata: ${activityTipo}`, `
    <p>La tua partecipazione all'attività di <strong>${activityTipo}</strong> del ${data} è confermata.</p>
  `);
}

async function sendActivityNewParticipant(creatorEmail, activityTipo, participantName) {
  await send(creatorEmail, `Nuovo partecipante: ${activityTipo}`, `
    <p><strong>${participantName}</strong> si è iscritto alla tua attività di <strong>${activityTipo}</strong>.</p>
  `);
}

async function sendActivityParticipantLeft(emails, activityTipo, participantName) {
  await Promise.all(emails.map((e) => send(e, `Aggiornamento attività: ${activityTipo}`, `
    <p><strong>${participantName}</strong> ha annullato la sua partecipazione all'attività di <strong>${activityTipo}</strong>.</p>
  `)));
}

async function sendActivityUpdated(emails, activityTipo) {
  await Promise.all(emails.map((e) => send(e, `Attività modificata: ${activityTipo}`, `
    <p>L'attività di <strong>${activityTipo}</strong> a cui sei iscritto è stata modificata. Controlla i nuovi dettagli sull'app.</p>
  `)));
}

async function sendActivityCancelled(emails, activityTipo) {
  await Promise.all(emails.map((e) => send(e, `Attività annullata: ${activityTipo}`, `
    <p>L'attività di <strong>${activityTipo}</strong> a cui eri iscritto è stata annullata dal creatore.</p>
  `)));
}

async function sendReportCreated(adminEmails, eventTitolo, reportTipo) {
  await Promise.all(adminEmails.map((e) => send(e, `Nuova segnalazione: ${eventTitolo}`, `
    <p>È stata ricevuta una nuova segnalazione di tipo <strong>${reportTipo}</strong> per l'evento "<strong>${eventTitolo}</strong>".</p>
    <p>Accedi alla dashboard di moderazione per esaminarla.</p>
  `)));
}

async function sendContentRemoved(entityEmail, eventTitolo) {
  await send(entityEmail, `Contenuto rimosso: ${eventTitolo}`, `
    <p>Il tuo evento "<strong>${eventTitolo}</strong>" è stato rimosso a seguito di una segnalazione.</p>
    <p>Se ritieni che la rimozione sia avvenuta per errore, contatta il team di Trento Live Activity.</p>
  `);
}

async function sendEmailVerification(email, nome, token) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verifica-email?token=${token}`;
  await send(email, 'Verifica la tua email — Trento Live Activity', `
    <p>Ciao <strong>${nome}</strong>,</p>
    <p>Grazie per esserti registrato su Trento Live Activity. Clicca il link seguente per verificare la tua email e attivare l'account:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>Il link è valido per 24 ore. Se non hai richiesto la registrazione, ignora questa email.</p>
  `);
}

async function sendWelcome(email, nome) {
  await send(email, 'Email verificata — Benvenuto su Trento Live Activity!', `
    <p>Ciao <strong>${nome}</strong>,</p>
    <p>La tua email è stata verificata con successo. Ora puoi esplorare la mappa di Trento, partecipare ad attività e ricevere notifiche sugli eventi vicino a te.</p>
    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Accedi all'app</a></p>
  `);
}

async function sendEntityRegistered(email, nomeEnte) {
  await send(email, 'Richiesta di registrazione ricevuta — Trento Live Activity', `
    <p>Grazie per aver registrato <strong>${nomeEnte}</strong> su Trento Live Activity.</p>
    <p>La tua richiesta è in fase di revisione da parte del nostro team. Riceverai un'email non appena verrà esaminata.</p>
  `);
}

async function sendNewEntityRequest(adminEmails, nomeEnte, entityEmail) {
  await Promise.all(adminEmails.map((e) => send(e, `Nuova richiesta ente: ${nomeEnte}`, `
    <p>È arrivata una nuova richiesta di registrazione come ente certificato.</p>
    <ul>
      <li><strong>Ente:</strong> ${nomeEnte}</li>
      <li><strong>Email:</strong> ${entityEmail}</li>
    </ul>
    <p>Accedi alla dashboard di amministrazione per approvare o rifiutare la richiesta.</p>
  `)));
}

async function sendEntityApproved(email, nomeEnte) {
  await send(email, 'Account approvato — Trento Live Activity', `
    <p>Congratulazioni! L'account di <strong>${nomeEnte}</strong> è stato approvato.</p>
    <p>Ora puoi accedere all'app e pubblicare eventi certificati.</p>
    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Accedi</a></p>
  `);
}

async function sendEntityRejected(email, nomeEnte) {
  await send(email, 'Richiesta non approvata — Trento Live Activity', `
    <p>Ci dispiace comunicarti che la richiesta di registrazione di <strong>${nomeEnte}</strong> non è stata approvata.</p>
    <p>Per maggiori informazioni puoi contattare il team di Trento Live Activity.</p>
  `);
}

async function sendNewEventToInterested(emails, titolo, categoria, eventId) {
  const appUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/eventi/${eventId}`;
  await Promise.all(emails.map((e) => send(e, `Nuovo evento ${categoria}: ${titolo}`, `
    <p>È stato pubblicato un nuovo evento certificato che corrisponde ai tuoi interessi (<strong>${categoria}</strong>).</p>
    <p><strong>${titolo}</strong></p>
    <p><a href="${appUrl}">Scopri l'evento</a></p>
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
  sendEmailVerification,
  sendWelcome,
  sendEntityRegistered,
  sendNewEntityRequest,
  sendEntityApproved,
  sendEntityRejected,
  sendNewEventToInterested,
};
