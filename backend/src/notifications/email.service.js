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

module.exports = {
  sendPasswordReset,
  sendActivityJoinConfirmation,
  sendActivityNewParticipant,
  sendActivityParticipantLeft,
  sendActivityUpdated,
  sendActivityCancelled,
};
