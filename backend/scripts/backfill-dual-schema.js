require('dotenv').config();
const { sequelize, Event, Activity } = require('../src/data/models');

// Backfill una-tantum dei campi del "social layer" (title, description, status,
// category, startDateTime, organizerId/authorId, ...) sui record creati PRIMA
// che esistessero quelle colonne.
//
// PROBLEMA: i dati veri dei record vecchi stanno nei campi italiani
// (titolo/descrizione/data/stato/tipo), mentre i campi inglesi sono NULL. I
// servizi social filtrano nel WHERE sui campi inglesi:
//   - socialActivities: where status IN ('ACTIVE','PUBLISHED','COMPLETED')
//   - socialEvents:      where startDateTime >= now (filtro "upcoming")
// quindi i record con quei campi a NULL venivano ESCLUSI dalle query (la
// dashboard mostrava 2 eventi / 4 attività invece di tutti). Il fallback in
// serializzazione non basta: l'esclusione avviene a monte, nella query.
//
// SOLUZIONE (non distruttiva): forziamo un save su ogni riga, così scatta
// l'hook `beforeSave` dei modelli Event/Activity che mappa italiano -> inglese
// (la stessa identica logica usata alla creazione di un record nuovo).
// Idempotente: gli hook riempiono solo i campi inglesi ancora vuoti.
async function run() {
  await sequelize.authenticate();
  console.log('Connesso al DB. Backfill in corso...');

  let okE = 0; let koE = 0;
  for (const ev of await Event.findAll()) {
    try {
      ev.changed('titolo', true); // forza l'UPDATE → l'hook popola title/startDateTime/...
      await ev.save();
      okE += 1;
    } catch (e) { koE += 1; console.error('  event', ev.id, '→', e.message); }
  }

  let okA = 0; let koA = 0;
  for (const ac of await Activity.findAll()) {
    try {
      ac.changed('tipo', true); // forza l'UPDATE → l'hook popola title/status/category/...
      await ac.save();
      okA += 1;
    } catch (e) { koA += 1; console.error('  activity', ac.id, '→', e.message); }
  }

  console.log(`Fatto. Eventi: ${okE} ok / ${koE} errori — Attività: ${okA} ok / ${koA} errori.`);
  await sequelize.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
