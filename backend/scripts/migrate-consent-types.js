/*
 * Migrazione: converte consents.type da ENUM a VARCHAR per supportare i nuovi
 * tipi `notif_email` e `notif_push` senza dover fare ALTER TYPE ad ogni
 * estensione. Idempotente.
 *
 * Uso:  node scripts/migrate-consent-types.js
 */
require('dotenv').config();
const { sequelize } = require('../src/data/models');

async function run() {
  await sequelize.authenticate();
  console.log('PostgreSQL connesso, eseguo migrazione…');
  await sequelize.query(`
    DO $$
    BEGIN
      -- 1. Se la colonna è ancora ENUM, convertila in VARCHAR(64).
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consents' AND column_name = 'type' AND udt_name <> 'varchar'
      ) THEN
        ALTER TABLE consents ALTER COLUMN type TYPE VARCHAR(64);
        RAISE NOTICE 'consents.type convertito a VARCHAR';
      ELSE
        RAISE NOTICE 'consents.type è già VARCHAR, niente da fare';
      END IF;

      -- 2. Drop del tipo ENUM se non più referenziato.
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_consents_type') THEN
        DROP TYPE enum_consents_type;
        RAISE NOTICE 'Tipo enum_consents_type rimosso';
      END IF;
    END$$;
  `);
  console.log('✓ Migrazione completata');
  await sequelize.close();
}

run().catch((e) => { console.error('Errore migrazione:', e); process.exit(1); });
