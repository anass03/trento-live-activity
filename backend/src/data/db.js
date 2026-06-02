const { Sequelize } = require('sequelize');

// Supabase / Neon / Render Postgres richiedono SSL ma presentano un certificato
// self-signed (Sequelize lo rifiuta di default). `rejectUnauthorized: false`
// accetta il certificato del provider managed.
//
// L'attivazione di SSL non dipende da NODE_ENV ma dall'host del DB:
// - localhost → no SSL (Postgres in dev, connessione in chiaro su loopback)
// - tutto il resto → SSL ON (Supabase, Neon, ecc., anche se NODE_ENV=development
//   ad esempio quando lo sviluppatore punta il backend locale al DB Supabase)
const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/trento_live';
const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: isLocalDb
    ? {}
    : { ssl: { require: true, rejectUnauthorized: false } },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = { sequelize };
