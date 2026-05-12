const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordReset(email, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Trento Live Activity <noreply@example.com>',
    to: email,
    subject: 'Reimposta la tua password — Trento Live Activity',
    html: `
      <p>Hai richiesto il reset della password.</p>
      <p>Clicca sul link seguente per reimpostare la password. Il link scade tra 1 ora.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Se non hai richiesto il reset, ignora questa email.</p>
    `,
  });
}

module.exports = { sendPasswordReset };
