// Blacklist persistente dei JWT revocati.
// Persistita su DB (tabella revoked_tokens) per:
//   - sopravvivere ai riavvii del backend (prima usavamo un Set in memoria
//     che si svuotava ad ogni restart → security #C3)
//   - condividere lo stato fra istance multiple in deployment scaled
//
// Cache in-memory davanti al DB per evitare di colpire Postgres ad ogni
// richiesta autenticata. Si popola al primo lookup di un dato jti.
const { RevokedToken } = require('../data/models');
const { Op } = require('sequelize');

// LRU semplice (Set con max size). Per dimensioni tipiche bastano poche
// migliaia di entry; oltre, si purga il più vecchio.
const cache = new Set();
const CACHE_MAX = 5000;

function cachePut(jti) {
  if (cache.size >= CACHE_MAX) {
    // Drop oldest (Set mantiene ordine di inserimento)
    const first = cache.values().next().value;
    cache.delete(first);
  }
  cache.add(jti);
}

// `expiresAt` deve corrispondere alla scadenza del token (`exp` del JWT * 1000).
// Se non fornito (legacy/test) usiamo 30 giorni come fallback prudente.
async function revoke(jti, expiresAtMs) {
  if (!jti) return;
  const expiresAt = expiresAtMs ? new Date(expiresAtMs) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  cachePut(jti);
  // upsert: il caller potrebbe chiamare revoke più volte sullo stesso jti.
  await RevokedToken.upsert({ jti, expiresAt }).catch(() => {
    // Se il DB è giù lasciamo la cache in memoria: meglio falso-revocato
    // (chiede re-login) che falso-valido (lascia entrare token vecchi).
  });
}

async function isRevoked(jti) {
  if (!jti) return false;
  if (cache.has(jti)) return true;
  const row = await RevokedToken.findByPk(jti).catch(() => null);
  if (row) {
    cachePut(jti);
    return true;
  }
  return false;
}

// Cleanup periodico: rimuove dal DB i token la cui naturale scadenza è
// passata (non c'è più motivo di tenerli in blacklist).
async function cleanupExpired() {
  try {
    await RevokedToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
  } catch { /* best-effort */ }
}

// Schedula il cleanup ogni 6 ore.
const cleanupInterval = setInterval(cleanupExpired, 6 * 60 * 60 * 1000);
cleanupInterval.unref?.(); // non blocca lo shutdown del processo

module.exports = { revoke, isRevoked, cleanupExpired };
