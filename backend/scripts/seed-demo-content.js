/**
 * Seed contenuti demo per il video di presentazione: eventi e attività
 * casuali ma realistici, distribuiti sui POI di Trento nei prossimi giorni.
 *
 * Gli ID dei record creati vengono salvati in scripts/.demo-content-ids.json:
 * la rimozione è chirurgica (solo ciò che è stato seminato qui) e nel frontend
 * non compare alcun marcatore visibile.
 *
 * Uso:
 *   node scripts/seed-demo-content.js           # crea i contenuti demo
 *   node scripts/seed-demo-content.js --clean   # rimuove SOLO i contenuti demo
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  sequelize, User, POI, Activity, Event, Participation, EventParticipation,
} = require('../src/data/models');

const IDS_FILE = path.join(__dirname, '.demo-content-ids.json');

const EVENT_TEMPLATES = [
  { titolo: 'Concerto al tramonto — Quartetto d\'archi', categoria: 'musica' },
  { titolo: 'Jazz in Piazza', categoria: 'musica' },
  { titolo: 'Notte dei Musei', categoria: 'cultura' },
  { titolo: 'Visita guidata al Ciclo dei Mesi', categoria: 'cultura' },
  { titolo: 'Mostra: Arte Alpina Contemporanea', categoria: 'arte' },
  { titolo: 'Laboratorio di acquerello in riva all\'Adige', categoria: 'arte' },
  { titolo: 'Torneo cittadino di beach volley', categoria: 'sport' },
  { titolo: 'Corsa delle Albere — 5km non competitiva', categoria: 'sport' },
  { titolo: 'Festival dello street food trentino', categoria: 'gastronomia' },
  { titolo: 'Degustazione vini della Piana Rotaliana', categoria: 'gastronomia' },
  { titolo: 'Mercatino dell\'artigianato locale', categoria: 'altro' },
  { titolo: 'Serata astronomia sotto le stelle', categoria: 'altro' },
];

const ACTIVITY_TYPES = ['sport', 'cultura', 'musica', 'studio', 'arte', 'gastronomia'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function pad(n) { return String(n).padStart(2, '0'); }

function futureDate(maxDays) {
  const d = new Date();
  d.setDate(d.getDate() + randInt(0, maxDays));
  return d.toISOString().slice(0, 10);
}

function timeSlot() {
  const startH = randInt(9, 20);
  const durH = randInt(1, 3);
  return [`${pad(startH)}:${pick(['00', '30'])}`, `${pad(Math.min(23, startH + durH))}:00`];
}

async function clean() {
  if (!fs.existsSync(IDS_FILE)) {
    console.log('Nessun file ID demo trovato: niente da rimuovere.');
    return;
  }
  const { eventIds = [], activityIds = [] } = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  if (eventIds.length) await EventParticipation.destroy({ where: { eventId: { [Op.in]: eventIds } } });
  if (activityIds.length) await Participation.destroy({ where: { activityId: { [Op.in]: activityIds } } });
  const ne = await Event.destroy({ where: { id: { [Op.in]: eventIds } } });
  const na = await Activity.destroy({ where: { id: { [Op.in]: activityIds } } });
  fs.unlinkSync(IDS_FILE);
  console.log(`Rimossi ${ne} eventi demo e ${na} attività demo.`);
}

async function seed() {
  if (fs.existsSync(IDS_FILE)) {
    throw new Error('Contenuti demo già presenti: esegui prima --clean per evitare duplicati.');
  }
  const enti = await User.findAll({ where: { ruolo: 'EnteCertificato' } });
  const cittadini = await User.findAll({ where: { ruolo: 'UtenteRegistrato' } });
  // I parcheggi sono POI di monitoraggio traffico: location poco credibili per la demo.
  const pois = (await POI.findAll()).filter((p) => !/^parcheggio/i.test(p.nome));
  if (!enti.length || !cittadini.length || !pois.length) {
    throw new Error('Servono enti, cittadini e POI nel DB: esegui prima "npm run seed".');
  }

  const eventIds = [];
  const activityIds = [];

  // ── Eventi (pubblicati dagli enti certificati) ───────────────────────
  for (const t of EVENT_TEMPLATES) {
    const poi = pick(pois);
    const [inizio, fine] = timeSlot();
    const e = await Event.create({
      titolo: t.titolo,
      categoria: t.categoria,
      descrizione: `${t.titolo} a ${poi.nome}. Ingresso libero fino a esaurimento posti.`,
      entityId: pick(enti).id,
      poiId: poi.id,
      latitudine: poi.latitudine,
      longitudine: poi.longitudine,
      indirizzo: poi.nome,
      data: futureDate(10),
      orarioInizio: inizio,
      orarioFine: fine,
      maxPartecipanti: pick([null, 30, 50, 100, 200]),
      badgeVerifica: true,
    });
    eventIds.push(e.id);
  }

  // ── Attività (proposte dai cittadini) ────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const poi = pick(pois);
    const [inizio, fine] = timeSlot();
    const a = await Activity.create({
      tipo: pick(ACTIVITY_TYPES),
      creatorId: pick(cittadini).id,
      poiId: poi.id,
      latitudine: poi.latitudine,
      longitudine: poi.longitudine,
      indirizzo: poi.nome,
      data: futureDate(7),
      orarioInizio: inizio,
      orarioFine: fine,
      maxPartecipanti: randInt(2, 20),
      stato: 'attiva',
    });
    activityIds.push(a.id);
  }

  // Qualche partecipazione per non mostrare contatori a zero nel video.
  for (const id of eventIds.slice(0, 6)) {
    await EventParticipation.findOrCreate({ where: { eventId: id, userId: pick(cittadini).id } });
  }
  for (const id of activityIds.slice(0, 5)) {
    await Participation.findOrCreate({ where: { activityId: id, userId: pick(cittadini).id } });
  }

  fs.writeFileSync(IDS_FILE, JSON.stringify({ eventIds, activityIds }, null, 2));
  console.log(`Creati ${eventIds.length} eventi demo e ${activityIds.length} attività demo.`);
  console.log('Per rimuoverli: node scripts/seed-demo-content.js --clean');
}

(async () => {
  await sequelize.authenticate();
  if (process.argv.includes('--clean')) await clean();
  else await seed();
  await sequelize.close();
})().catch((e) => { console.error(e.message || e); process.exit(1); });
