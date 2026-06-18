const { sequelize } = require('./db');

// Riconciliazione esplicita e idempotente dello schema per le tabelle `events`
// e `activities`.
//
// PERCHÉ ESISTE QUESTO MODULO
// I modelli Event e Activity sono cresciuti con un secondo set di colonne
// (il "social layer": title, description, status, startDateTime, category, ...).
// In locale `sequelize.sync({ alter: true })` le aggiunge senza problemi, ma in
// produzione il database gira dietro il POOLER di Supabase (pgBouncer in
// transaction mode). Lì l'ALTER multi-statement che Sequelize genera per
// `alter: true` NON viene applicato in modo affidabile: ritorna senza errore
// (quindi il server parte regolarmente) ma le colonne non vengono create.
//
// Conseguenza: poiché Sequelize seleziona di default TUTTI gli attributi del
// modello (e map.service seleziona esplicitamente Activity.title), ogni SELECT
// referenzia colonne che nel DB non esistono → Postgres risponde
// `column "..." does not exist` → 500 non gestito su /api/events, /api/map e
// sul feed social.
//
// La soluzione qui sotto usa singole DDL `ALTER TABLE ... ADD COLUMN IF NOT
// EXISTS`, idempotenti e atomiche, che attraversano puliti anche il pooler.
// Le colonne enum del modello vengono materializzate come VARCHAR: per
// SELECT/WHERE/INSERT è equivalente e ci evita di creare tipi enum Postgres via
// SQL grezzo (operazione fragile e multi-statement dietro pgBouncer).

const EVENTS_COLUMNS = {
  title: 'VARCHAR(255)',
  description: 'TEXT',
  category: 'VARCHAR(30)',
  locationName: 'VARCHAR(255)',
  address: 'VARCHAR(255)',
  organizerId: 'UUID',
  startDateTime: 'TIMESTAMP WITH TIME ZONE',
  endDateTime: 'TIMESTAMP WITH TIME ZONE',
  capacity: 'INTEGER',
  imageUrls: "VARCHAR(255)[] DEFAULT '{}'",
  status: "VARCHAR(20) DEFAULT 'PUBLISHED'",
  isFeatured: 'BOOLEAN DEFAULT false',
  participantsCount: 'INTEGER DEFAULT 0',
  likesCount: 'INTEGER DEFAULT 0',
  commentsCount: 'INTEGER DEFAULT 0',
  savesCount: 'INTEGER DEFAULT 0',
  sharesCount: 'INTEGER DEFAULT 0',
  indirizzo: 'VARCHAR(255)',
};

const ACTIVITIES_COLUMNS = {
  title: 'VARCHAR(255)',
  description: 'TEXT',
  imageUrls: "VARCHAR(255)[] DEFAULT '{}'",
  category: "VARCHAR(20) DEFAULT 'OTHER'",
  tags: "VARCHAR(255)[] DEFAULT '{}'",
  locationName: 'VARCHAR(255)',
  address: 'VARCHAR(255)',
  durationMinutes: 'INTEGER DEFAULT 60',
  difficulty: "VARCHAR(20) DEFAULT 'MEDIUM'",
  priceType: "VARCHAR(20) DEFAULT 'FREE'",
  priceLabel: 'VARCHAR(255)',
  authorId: 'UUID',
  status: "VARCHAR(20) DEFAULT 'ACTIVE'",
  capacity: 'INTEGER',
  participantsCount: 'INTEGER DEFAULT 0',
  averageRating: 'DOUBLE PRECISION DEFAULT 0',
  reviewCount: 'INTEGER DEFAULT 0',
  verifiedActivity: 'BOOLEAN DEFAULT false',
  suitableNow: 'BOOLEAN DEFAULT true',
  risingScore: 'DOUBLE PRECISION DEFAULT 0',
  trustRequired: 'BOOLEAN DEFAULT false',
  indirizzo: 'VARCHAR(255)',
};

async function addMissingColumns(table, columns) {
  for (const [name, definition] of Object.entries(columns)) {
    // IF NOT EXISTS rende l'operazione idempotente; ogni colonna è uno statement
    // a sé, così un eventuale fallimento isolato non blocca le altre né il boot.
    // I nomi sono quotati: i modelli non usano `underscored`, quindi le colonne
    // sono camelCase esatte (es. "startDateTime").
    await sequelize
      .query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${name}" ${definition}`)
      .catch((e) => {
        console.error(JSON.stringify({
          event: 'ensure_schema_error', table, column: name, message: e.message, level: 'error',
        }));
      });
  }
}

// Allinea il DB allo stato atteso dai modelli per le tabelle soggette al
// dual-schema. Va invocata al boot dopo `sequelize.sync()`.
async function ensureSchema() {
  await addMissingColumns('events', EVENTS_COLUMNS);
  await addMissingColumns('activities', ACTIVITIES_COLUMNS);
  console.log(JSON.stringify({ event: 'ensure_schema_done', level: 'info' }));
}

module.exports = { ensureSchema };
