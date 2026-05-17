/**
 * One-time backfill: geocode all existing POIs, Events, and Activities
 * that have coordinates but no stored indirizzo.
 * Run with: node scripts/geocode-backfill.js
 */
require('dotenv').config();
const { sequelize } = require('../src/data/db');
const { POI, Event, Activity } = require('../src/data/models');
const { reverseGeocode } = require('../src/lib/geocode');

async function backfill(Model, label) {
  const records = await Model.findAll({
    where: sequelize.literal('"indirizzo" IS NULL AND "latitudine" IS NOT NULL AND "longitudine" IS NOT NULL'),
  });
  console.log(`[${label}] ${records.length} records to geocode`);
  let done = 0;
  for (const record of records) {
    const address = await reverseGeocode(record.latitudine, record.longitudine);
    if (address) {
      await record.update({ indirizzo: address });
      console.log(`  ✓ ${record.nome || record.titolo || record.id} → ${address}`);
    } else {
      console.log(`  ✗ ${record.nome || record.titolo || record.id} → not resolved`);
    }
    done++;
    process.stdout.write(`\r  ${done}/${records.length}`);
  }
  console.log(`\n[${label}] done`);
}

async function main() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  await backfill(POI, 'POI');
  await backfill(Event, 'Events');
  await backfill(Activity, 'Activities');
  console.log('Backfill complete.');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
