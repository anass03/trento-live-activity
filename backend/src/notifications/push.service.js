const path = require('path');
const { Op } = require('sequelize');
const { User, DeviceToken } = require('../data/models');

let messaging = null;
let initAttempted = false;

function init() {
  if (initAttempted) return messaging;
  initAttempted = true;

  const credPath = process.env.FIREBASE_CREDENTIALS_PATH;
  if (!credPath) return null;

  try {
    const admin = require('firebase-admin');
    const resolvedPath = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
    const serviceAccount = require(resolvedPath);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
    console.log('[push] Firebase Cloud Messaging initialised');
  } catch (e) {
    console.error('[push] Failed to init Firebase:', e.message);
    messaging = null;
  }
  return messaging;
}

async function sendToTokens(tokens, { title, body, data }) {
  if (!tokens || tokens.length === 0) return;
  const m = init();
  if (!m) {
    console.log(`[push:stub] tokens=${tokens.length} title="${title}" body="${body}"`);
    return;
  }
  try {
    const response = await m.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: data || {},
    });
    // Clean up tokens that the FCM service reports as invalid
    if (response.failureCount > 0) {
      const stale = [];
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code;
          if (code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered') {
            stale.push(tokens[idx]);
          }
        }
      });
      if (stale.length) {
        await DeviceToken.destroy({ where: { token: { [Op.in]: stale } } });
      }
    }
  } catch (e) {
    console.error('[push] send failed:', e.message);
  }
}

async function getUserTokens(userId) {
  const rows = await DeviceToken.findAll({ where: { userId }, attributes: ['token'] });
  return rows.map((r) => r.token);
}

// Trigger 1: new participant joined an activity → notify creator
async function sendActivityJoined(creatorUserId, activityTipo, participantName) {
  const tokens = await getUserTokens(creatorUserId);
  return sendToTokens(tokens, {
    title: `Nuovo partecipante: ${activityTipo}`,
    body: `${participantName} si è iscritto alla tua attività`,
    data: { type: 'activity_joined' },
  });
}

// Push to many user ids — used for activity cancelled/updated/left flows.
async function sendToUsers(userIds, payload) {
  if (!userIds || userIds.length === 0) return;
  const rows = await DeviceToken.findAll({
    where: { userId: { [Op.in]: userIds } },
    attributes: ['token'],
  });
  const tokens = rows.map((r) => r.token);
  if (tokens.length === 0) return;
  return sendToTokens(tokens, payload);
}

async function sendActivityCancelled(userIds, activityTipo, activityId) {
  return sendToUsers(userIds, {
    title: `Attività annullata: ${activityTipo}`,
    body: `Il creatore ha annullato l'attività di ${activityTipo} a cui partecipavi`,
    data: { type: 'activity_cancelled', activityId: String(activityId) },
  });
}

async function sendActivityUpdated(userIds, activityTipo, activityId) {
  return sendToUsers(userIds, {
    title: `Attività modificata: ${activityTipo}`,
    body: `I dettagli dell'attività di ${activityTipo} sono cambiati. Controlla l'app.`,
    data: { type: 'activity_updated', activityId: String(activityId) },
  });
}

async function sendParticipantLeft(userIds, activityTipo, participantName, activityId) {
  return sendToUsers(userIds, {
    title: `${participantName} ha abbandonato`,
    body: `${participantName} non parteciperà più all'attività di ${activityTipo}`,
    data: { type: 'participant_left', activityId: String(activityId) },
  });
}

async function sendReportOutcome(userId, eventTitolo, outcome) {
  const tokens = await getUserTokens(userId);
  const labels = {
    rimosso: 'Evento rimosso',
    archiviato: 'Segnalazione archiviata',
    in_lavorazione: 'Segnalazione in lavorazione',
  };
  return sendToTokens(tokens, {
    title: labels[outcome] || 'Aggiornamento segnalazione',
    body: `La tua segnalazione per "${eventTitolo}" è stata gestita.`,
    data: { type: 'report_outcome', outcome },
  });
}

// Haversine distance between two coordinates, in kilometres
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Trigger 3 (RF40): newly created activity → notify interested users.
// When a location is available, only users within radiusKm are notified.
// When no location is available (creator hasn't shared theirs), fall back to
// notifying ALL interested users who have a registered device token.
async function sendActivityNearby({ activityId, tipo, lat, lng, creatorId, radiusKm = 50 }) {
  const hasLocation = lat != null && lng != null;

  let targetUserIds;
  if (hasLocation) {
    const candidates = await User.findAll({
      where: {
        ruolo: 'UtenteRegistrato',
        interessi: { [Op.contains]: [tipo] },
        lastLat: { [Op.not]: null },
        lastLng: { [Op.not]: null },
        id: { [Op.ne]: creatorId },
      },
      attributes: ['id', 'lastLat', 'lastLng'],
    });
    targetUserIds = candidates
      .filter((u) => haversineKm(lat, lng, u.lastLat, u.lastLng) <= radiusKm)
      .map((u) => u.id);
    console.log(`[push] sendActivityNearby: ${candidates.length} candidates within area, ${targetUserIds.length} within ${radiusKm}km`);
  } else {
    // No location — notify all interested registered users (same breadth as email fallback)
    const all = await User.findAll({
      where: {
        ruolo: 'UtenteRegistrato',
        interessi: { [Op.contains]: [tipo] },
        id: { [Op.ne]: creatorId },
      },
      attributes: ['id'],
    });
    targetUserIds = all.map((u) => u.id);
    console.log(`[push] sendActivityNearby: no location, targeting all ${targetUserIds.length} interested users`);
  }

  if (targetUserIds.length === 0) return;

  const rows = await DeviceToken.findAll({
    where: { userId: { [Op.in]: targetUserIds } },
    attributes: ['token'],
  });
  const tokens = rows.map((r) => r.token);
  console.log(`[push] sendActivityNearby: ${tokens.length} device tokens found`);
  if (tokens.length === 0) return;

  return sendToTokens(tokens, {
    title: `Nuova attività di ${tipo}`,
    body: hasLocation
      ? `Un'attività di ${tipo} è stata pubblicata entro ${radiusKm} km da te`
      : `È stata pubblicata una nuova attività di ${tipo} a Trento`,
    data: { type: 'activity_nearby', activityId: String(activityId) },
  });
}

// Trigger 2: a certified entity published a new event → notify users with matching interest
async function sendNewEventToInterested(eventId, categoria, titolo) {
  const interestedUsers = await User.findAll({
    where: {
      ruolo: 'UtenteRegistrato',
      interessi: { [Op.contains]: [categoria] },
    },
    attributes: ['id'],
  });
  if (interestedUsers.length === 0) return;

  const rows = await DeviceToken.findAll({
    where: { userId: { [Op.in]: interestedUsers.map((u) => u.id) } },
    attributes: ['token'],
  });
  const tokens = rows.map((r) => r.token);
  if (tokens.length === 0) return;

  return sendToTokens(tokens, {
    title: `Nuovo evento ${categoria}`,
    body: titolo,
    // FCM requires every value in `data` to be a string.
    data: { type: 'new_event', eventId: String(eventId), categoria: String(categoria) },
  });
}

// ── Admin broadcast (manual push from the admin panel) ──────────────────
const ROLE_BY_AUDIENCE = {
  cittadini: 'UtenteRegistrato',
  enti: 'EnteCertificato',
  comunali: 'AmministratoreComunale',
};

// Send a manual notification to a whole audience. audience='all' targets every
// registered device token; otherwise only tokens belonging to users of that role.
async function sendBroadcast({ title, body, audience = 'all' }) {
  const where = {};
  if (audience !== 'all') {
    const role = ROLE_BY_AUDIENCE[audience];
    const users = await User.findAll({ where: { ruolo: role }, attributes: ['id'] });
    if (users.length === 0) return { tokensTargeted: 0, audience };
    where.userId = { [Op.in]: users.map((u) => u.id) };
  }
  const rows = await DeviceToken.findAll({ where, attributes: ['token'] });
  const tokens = rows.map((r) => r.token);
  await sendToTokens(tokens, { title, body, data: { type: 'broadcast' } });
  return { tokensTargeted: tokens.length, audience };
}

// Reach stats for the admin dashboard: how many devices/users we can target.
async function getTokenStats() {
  const rows = await DeviceToken.findAll({ attributes: ['platform', 'userId'] });
  const byPlatform = {};
  const users = new Set();
  for (const r of rows) {
    byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1;
    users.add(r.userId);
  }
  return { totalTokens: rows.length, usersReachable: users.size, byPlatform };
}

// Eager init at module load so configuration problems surface at startup
// instead of waiting for the first push trigger.
init();

module.exports = {
  sendActivityJoined,
  sendNewEventToInterested,
  sendActivityNearby,
  sendActivityCancelled,
  sendActivityUpdated,
  sendParticipantLeft,
  sendReportOutcome,
  sendBroadcast,
  getTokenStats,
  // exposed for tests / admin debug
  sendToTokens,
  sendToUsers,
  getUserTokens,
};
