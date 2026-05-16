/*
 * Migrazione one-shot di sicurezza (#bug-2025-05-16):
 *
 * Prima di questo fix, i nuovi utenti OAuth (Google/Apple) venivano creati
 * con un `passwordHash` randomico (vedi oauth.service.js precedente).
 * Conseguenza: `forgotPassword` accettava la mail OAuth come "valida" perché
 * `user.passwordHash` non era null, mandava il link di reset, e chiunque
 * avesse accesso alla mail poteva impostare una password e fare login
 * bypassando OAuth.
 *
 * Ora i nuovi signup OAuth hanno `passwordHash = null` e il flusso reset li
 * blocca. Questo script ripulisce gli account già creati col vecchio comportamento.
 *
 * Heuristic: gli account OAuth si riconoscono dal `codiceFiscale` sentinel
 * generato in oauth.service.js -> `GOOGLE-XXXXXXXXXXX` o `APPLE-XXXXXXXXXXX`.
 * Se l'utente ha già modificato il CF a mano dal profilo, NON lo tocchiamo
 * (significa che potrebbe aver scelto di usare anche una password sua).
 *
 * Uso: node scripts/migrate-oauth-passwords.js
 * Idempotente: gli utenti già con passwordHash=null vengono saltati.
 */
require('dotenv').config();
const { sequelize, User } = require('../src/data/models');
const { Op } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  console.log('PostgreSQL connesso, scansiono utenti OAuth con random passwordHash…');

  const candidates = await User.findAll({
    where: {
      [Op.and]: [
        { passwordHash: { [Op.ne]: null } },
        {
          [Op.or]: [
            { codiceFiscale: { [Op.like]: 'GOOGLE-%' } },
            { codiceFiscale: { [Op.like]: 'APPLE-%' } },
          ],
        },
      ],
    },
    attributes: ['id', 'email', 'codiceFiscale', 'ruolo'],
  });

  if (candidates.length === 0) {
    console.log('Nessun account OAuth da migrare. Esco.');
    await sequelize.close();
    return;
  }

  console.log(`Trovati ${candidates.length} account OAuth da ripulire:`);
  for (const u of candidates) {
    console.log(`  - ${u.email} (CF: ${u.codiceFiscale}, ruolo: ${u.ruolo})`);
  }

  const [, affected] = await User.update(
    { passwordHash: null, passwordResetToken: null, passwordResetExpires: null },
    {
      where: {
        id: { [Op.in]: candidates.map((u) => u.id) },
      },
    },
  );
  console.log(`OK: aggiornati ${affected != null ? affected : candidates.length} utenti (passwordHash=null, reset token revocati).`);

  await sequelize.close();
}

run().catch((e) => {
  console.error('Migrazione fallita:', e);
  process.exit(1);
});
