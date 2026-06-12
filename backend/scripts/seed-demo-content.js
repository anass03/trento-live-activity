/**
 * Seed contenuti demo per il video di presentazione: eventi e attività
 * casuali ma realistici, distribuiti sui POI di Trento nei prossimi giorni.
 * Include anche commenti, reazioni, recensioni e service request per le statistiche.
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
  Comment, Reaction, Review, ServiceRequest,
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
const SR_CATEGORIES = ['parcheggio_auto', 'parcheggio_bici', 'sport', 'studio', 'verde', 'cultura', 'ciclismo', 'altro'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function pad(n) { return String(n).padStart(2, '0'); }

function futureDate(maxDays) {
  const d = new Date();
  d.setDate(d.getDate() + randInt(0, maxDays));
  return d.toISOString().slice(0, 10);
}

function pastDateStr(maxDays) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, maxDays));
  return d.toISOString();
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
  const { 
    eventIds = [], activityIds = [], commentIds = [], 
    reactionIds = [], reviewIds = [], requestIds = [] 
  } = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  
  if (commentIds.length) await Comment.destroy({ where: { id: { [Op.in]: commentIds } } });
  if (reactionIds.length) await Reaction.destroy({ where: { id: { [Op.in]: reactionIds } } });
  if (reviewIds.length) await Review.destroy({ where: { id: { [Op.in]: reviewIds } } });
  if (requestIds.length) await ServiceRequest.destroy({ where: { id: { [Op.in]: requestIds } } });
  
  if (eventIds.length) await EventParticipation.destroy({ where: { eventId: { [Op.in]: eventIds } } });
  if (activityIds.length) await Participation.destroy({ where: { activityId: { [Op.in]: activityIds } } });
  
  const ne = await Event.destroy({ where: { id: { [Op.in]: eventIds } } });
  const na = await Activity.destroy({ where: { id: { [Op.in]: activityIds } } });
  
  fs.unlinkSync(IDS_FILE);
  console.log(`Rimossi ${ne} eventi demo, ${na} attività demo, ${commentIds.length} commenti, ${reactionIds.length} reazioni, ${reviewIds.length} recensioni, ${requestIds.length} richieste di servizio.`);
}

async function seed() {
  if (fs.existsSync(IDS_FILE)) {
    throw new Error('Contenuti demo già presenti: esegui prima --clean per evitare duplicati.');
  }
  const enti = await User.findAll({ where: { ruolo: 'EnteCertificato' } });
  const cittadini = await User.findAll({ where: { ruolo: 'UtenteRegistrato' } });
  const pois = (await POI.findAll()).filter((p) => !/^parcheggio/i.test(p.nome));
  if (!enti.length || !cittadini.length || !pois.length) {
    throw new Error('Servono enti, cittadini e POI nel DB: esegui prima "npm run seed".');
  }

  const eventIds = [];
  const activityIds = [];
  const commentIds = [];
  const reactionIds = [];
  const reviewIds = [];
  const requestIds = [];

  // ── Eventi (pubblicati dagli enti certificati) ───────────────────────
  for (const t of EVENT_TEMPLATES) {
    const poi = pick(pois);
    const [inizio, fine] = timeSlot();
    const entity = pick(enti);
    const e = await Event.create({
      titolo: t.titolo,
      categoria: t.categoria,
      descrizione: `${t.titolo} a ${poi.nome}. Ingresso libero fino a esaurimento posti.`,
      entityId: entity.id,
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
    const pdEv = pastDateStr(14);
    await sequelize.query(`UPDATE "events" SET "createdAt" = :d WHERE id = :id`, { replacements: { d: pdEv, id: e.id } });
    eventIds.push(e.id);
    
    // Create random comments
    for (let j = 0; j < randInt(1, 4); j++) {
      const c = await Comment.create({
        eventId: e.id,
        userId: pick(cittadini).id,
        body: pick(['Bellissimo evento!', 'Non vedo l\'ora!', 'Ci sarò sicuramente.', 'Organizzazione top.', 'Speriamo nel bel tempo.']),
      });
      commentIds.push(c.id);
    }
    
    // Create random reactions
    for (let j = 0; j < randInt(2, 6); j++) {
      const u = pick(cittadini);
      const [r, created] = await Reaction.findOrCreate({
        where: { userId: u.id, targetType: 'EVENT', targetId: e.id },
        defaults: { type: 'LIKE' }
      });
      if (created) reactionIds.push(r.id);
    }
    
    // Create random reviews
    for (let j = 0; j < randInt(1, 3); j++) {
      const u = pick(cittadini);
      const [rev, created] = await Review.findOrCreate({
        where: { reviewerId: u.id, targetType: 'EVENT', targetId: e.id },
        defaults: {
          authorId: entity.id,
          ratingOverall: randInt(3, 5),
          ratingAccuracy: randInt(3, 5),
          ratingOrganization: randInt(3, 5),
          ratingSafety: randInt(3, 5),
          ratingAtmosphere: randInt(3, 5),
          comment: pick(['Fantastico', 'Molto bene', 'Consigliato evento']),
        }
      });
      if (created) reviewIds.push(rev.id);
    }
  }

  // ── Attività (proposte dai cittadini) ────────────────────────────────
  for (let i = 0; i < 40; i++) {
    const poi = pick(pois);
    const [inizio, fine] = timeSlot();
    const creator = pick(cittadini);
    const a = await Activity.create({
      tipo: pick(ACTIVITY_TYPES),
      creatorId: creator.id,
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
    const pdAct = pastDateStr(14);
    await sequelize.query(`UPDATE "activities" SET "createdAt" = :d WHERE id = :id`, { replacements: { d: pdAct, id: a.id } });
    activityIds.push(a.id);
    
    // Create random reviews
    for (let j = 0; j < randInt(0, 2); j++) {
      const u = pick(cittadini);
      if (u.id === creator.id) continue;
      const [rev, created] = await Review.findOrCreate({
        where: { reviewerId: u.id, targetType: 'ACTIVITY', targetId: a.id },
        defaults: {
          authorId: creator.id,
          ratingOverall: randInt(3, 5),
          ratingAccuracy: randInt(3, 5),
          ratingOrganization: randInt(3, 5),
          ratingSafety: randInt(3, 5),
          ratingAtmosphere: randInt(3, 5),
          comment: pick(['Bella iniziativa', 'Mi sono divertito', 'Da rifare']),
        }
      });
      if (created) reviewIds.push(rev.id);
    }
  }

  // ── Service Requests (richieste servizi / statistiche) ───────────────
  for (let i = 0; i < 20; i++) {
    const poi = pick(pois);
    const sr = await ServiceRequest.create({
      categoria: pick(SR_CATEGORIES),
      latitudine: poi.latitudine + (Math.random() * 0.01 - 0.005),
      longitudine: poi.longitudine + (Math.random() * 0.01 - 0.005),
      userId: pick(cittadini).id,
    });
    requestIds.push(sr.id);
  }

  // Qualche partecipazione per non mostrare contatori a zero nel video.
  for (const id of eventIds.slice(0, 8)) {
    for (let j=0; j<randInt(2, 5); j++) {
      await EventParticipation.findOrCreate({ where: { eventId: id, userId: pick(cittadini).id } });
    }
  }
  for (const id of activityIds.slice(0, 10)) {
    for (let j=0; j<randInt(1, 3); j++) {
      await Participation.findOrCreate({ where: { activityId: id, userId: pick(cittadini).id } });
    }
  }

  fs.writeFileSync(IDS_FILE, JSON.stringify({ 
    eventIds, activityIds, commentIds, reactionIds, reviewIds, requestIds 
  }, null, 2));
  
  console.log(`Creati:
  - ${eventIds.length} eventi
  - ${activityIds.length} attività
  - ${commentIds.length} commenti
  - ${reactionIds.length} reazioni
  - ${reviewIds.length} recensioni
  - ${requestIds.length} richieste servizio`);
  console.log('Per rimuoverli: node scripts/seed-demo-content.js --clean');
}

(async () => {
  await sequelize.authenticate();
  if (process.argv.includes('--clean')) await clean();
  else await seed();
  await sequelize.close();
})().catch((e) => { console.error(e.message || e); process.exit(1); });

