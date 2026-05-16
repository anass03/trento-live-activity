require('dotenv').config();

// #M4: guard di sicurezza al boot. Se JWT_SECRET è assente o troppo corto,
// la firma dei token è triviale da indovinare → bypass autenticazione totale.
// Blocca l'avvio prima di accettare qualsiasi richiesta.
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET deve essere settato e lungo almeno 32 caratteri.');
  console.error('Genera una stringa random sicura, es.: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}
// In produzione vietiamo anche segreti palesemente di esempio dal .env.example.
const FORBIDDEN_SECRETS = ['change-me-to-a-long-random-string', 'changeme', 'secret', 'jwtsecret'];
if (process.env.NODE_ENV === 'production' && FORBIDDEN_SECRETS.includes(jwtSecret.toLowerCase())) {
  console.error('FATAL: JWT_SECRET di esempio rilevato in produzione. Genera un secret reale.');
  process.exit(1);
}
// #C1 + #M8: MOCK_CURRENT_USER_EMAIL era usato dalla route insicura /api/users/me
// (ora rimossa). Se qualcuno la setta in produzione è quasi sempre un errore.
if (process.env.NODE_ENV === 'production' && process.env.MOCK_CURRENT_USER_EMAIL) {
  console.error('FATAL: MOCK_CURRENT_USER_EMAIL non deve essere settato in produzione.');
  process.exit(1);
}

const app = require('./app');
const { sequelize } = require('./data/db');

const PORT = process.env.PORT || 3000;

async function start() {
  await sequelize.authenticate();
  console.log('PostgreSQL connected');
  await sequelize.sync({ alter: true });
  console.log('Models synced');
  app.listen(PORT, () => console.log(`API Gateway listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
