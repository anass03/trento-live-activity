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
  // Riconciliazione ADDITIVA dello schema. { alter: { drop: false } } fa eseguire
  // a Sequelize solo il ramo che AGGIUNGE le colonne dei modelli mancanti nel DB
  // (sequelize/lib/model.js:954-959) e crea i tipi enum, ma SALTA l'intero ramo
  // distruttivo di `alter` — rimozione colonne e cambio tipo (model.js:961+).
  //
  // Perché NON { alter: true }: con il drop attivo (è il default), ogni avvio di
  // un backend riallineava il DB Supabase CONDIVISO al PROPRIO modello,
  // cancellando le colonne che quel modello non aveva. Bastava un boot con un
  // branch vecchio o un backend locale puntato a Supabase per droppare le colonne
  // del social layer (events/activities) e di `users` → ogni SELECT su quelle
  // colonne falliva con `column ... does not exist` → 500 su /api/events,
  // /api/map e /auth/login. { drop: false } aggiunge soltanto: non droppa mai.
  await sequelize.sync({ alter: { drop: false } });
  // sync non rimuove il NOT NULL da colonne FK preesistenti:
  // reports.eventId deve essere nullable da quando le segnalazioni
  // coprono anche le attività (eventId XOR activityId). Idempotente.
  await sequelize.query('ALTER TABLE "reports" ALTER COLUMN "eventId" DROP NOT NULL').catch(() => {});
  console.log('Models synced');
  app.listen(PORT, () => console.log(`API Gateway listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
