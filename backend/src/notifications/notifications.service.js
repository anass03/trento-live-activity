const { DeviceToken } = require('../data/models');
const push = require('./push.service');
const { sendToTokens } = push;
const logger = require('../lib/logger');

const VALID_PLATFORMS = ['web', 'ios', 'android'];
const VALID_AUDIENCES = ['all', 'cittadini', 'enti', 'comunali'];

async function sendTestPush(userId) {
  const tokens = (await DeviceToken.findAll({ where: { userId }, attributes: ['token'] }))
    .map((r) => r.token);
  if (tokens.length === 0) {
    throw { status: 400, code: 'NO_DEVICE_TOKEN', error: 'Nessun token registrato. Attiva prima le notifiche push.' };
  }
  await sendToTokens(tokens, {
    title: '🔔 Notifica di test',
    body: 'Se vedi questo messaggio, le tue notifiche push funzionano correttamente.',
    data: { type: 'test' },
  });
  return { tokensTargeted: tokens.length };
}

async function registerDeviceToken(userId, { token, platform = 'web' }) {
  if (!token) {
    throw { status: 400, code: 'MISSING_TOKEN', error: 'Device token is required' };
  }
  if (!VALID_PLATFORMS.includes(platform)) {
    throw { status: 400, code: 'INVALID_PLATFORM', error: `platform must be one of ${VALID_PLATFORMS.join(', ')}` };
  }

  // Same FCM token may be re-registered (login from a previously logged-out device).
  // Re-associate it with the current user.
  const existing = await DeviceToken.findOne({ where: { token } });
  if (existing) {
    if (existing.userId !== userId || existing.platform !== platform) {
      await existing.update({ userId, platform });
    }
    return existing;
  }
  try {
    return await DeviceToken.create({ userId, token, platform });
  } catch (e) {
    // Race: due registrazioni concorrenti dello stesso token superano entrambe
    // il findOne sopra e la seconda create viola l'indice UNIQUE → 500.
    // In quel caso ri-associamo la riga già inserita all'utente corrente.
    if (e?.name !== 'SequelizeUniqueConstraintError') throw e;
    const row = await DeviceToken.findOne({ where: { token } });
    if (!row) throw e;
    if (row.userId !== userId || row.platform !== platform) {
      await row.update({ userId, platform });
    }
    return row;
  }
}

async function unregisterDeviceToken(userId, token) {
  if (!token) {
    throw { status: 400, code: 'MISSING_TOKEN', error: 'Device token is required' };
  }
  await DeviceToken.destroy({ where: { userId, token } });
}

// ── Admin: manual broadcast + reach stats ───────────────────────────────
async function broadcast(actorId, { title, body, audience }) {
  if (!title || !String(title).trim()) {
    throw { status: 400, code: 'MISSING_TITLE', error: 'Il titolo è obbligatorio.' };
  }
  if (!body || !String(body).trim()) {
    throw { status: 400, code: 'MISSING_BODY', error: 'Il messaggio è obbligatorio.' };
  }
  const aud = audience || 'all';
  if (!VALID_AUDIENCES.includes(aud)) {
    throw { status: 400, code: 'INVALID_AUDIENCE', error: `audience deve essere uno di: ${VALID_AUDIENCES.join(', ')}` };
  }
  const result = await push.sendBroadcast({ title: String(title).trim(), body: String(body).trim(), audience: aud });
  logger.audit('notification.broadcast', {
    actorId,
    audience: aud,
    tokensTargeted: result.tokensTargeted,
    title: String(title).trim(),
  });
  return result;
}

async function getStats() {
  return push.getTokenStats();
}

module.exports = { registerDeviceToken, unregisterDeviceToken, sendTestPush, broadcast, getStats };
