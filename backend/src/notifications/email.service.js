const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function send(to, subject, html) {
  if (!to) return;
  const t = getTransporter();
  if (!t) {
    console.log(`[email:stub] to=${to} subject="${subject}"`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || 'Trento Live Activity <noreply@example.com>',
      to, subject, html,
    });
  } catch (e) {
    console.error('[email] send failed:', e.message);
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

module.exports = {
  sendPasswordReset,
  sendActivityJoinConfirmation,
  sendActivityNewParticipant,
  sendActivityParticipantLeft,
  sendActivityUpdated,
  sendActivityCancelled,
  sendReportCreated,
  sendContentRemoved,
};
