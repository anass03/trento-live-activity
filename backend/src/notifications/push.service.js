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
    data: { type: 'new_event', eventId, categoria },
  });
}

// Eager init at module load so configuration problems surface at startup
// instead of waiting for the first push trigger.
init();

module.exports = {
  sendActivityJoined,
  sendNewEventToInterested,
  // exposed for tests / admin debug
  sendToTokens,
  getUserTokens,
};
