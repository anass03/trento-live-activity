/*
 * Migrazione: aggiunge 'arte' e 'gastronomia' all'ENUM activities.tipo.
 * Idempotente — usa IF NOT EXISTS, sicuro da rieseguire.
 *
 * Uso: node scripts/migrate-activity-types.js
 */
require('dotenv').config();
const { sequelize } = require('../src/data/models');

async function run() {
  await sequelize.authenticate();
  console.log('PostgreSQL connesso, eseguo migrazione…');

  // PostgreSQL richiede ALTER TYPE fuori da un blocco transazionale standard.
  // Usiamo statement separati; IF NOT EXISTS li rende idempotenti.
  await sequelize.query(`ALTER TYPE enum_activities_tipo ADD VALUE IF NOT EXISTS 'arte';`);
  await sequelize.query(`ALTER TYPE enum_activities_tipo ADD VALUE IF NOT EXISTS 'gastronomia';`);

  console.log("✓ Valori 'arte' e 'gastronomia' aggiunti all'ENUM enum_activities_tipo");
  await sequelize.close();
}

run().catch((e) => { console.error('Errore migrazione:', e.message); process.exit(1); });
