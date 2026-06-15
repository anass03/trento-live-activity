const { Op } = require('sequelize');
const { Activity, Participation, User, POI, UserSettings } = require('../data/models');
const { serializeActivity } = require('../data/presenters');
const { reverseGeocode } = require('../lib/geocode');
const { ACTIVITY_TYPES } = require('../data/models/Activity');
const {
  sendActivityJoinConfirmation,
  sendActivityNewParticipant,
  sendActivityParticipantLeft,
  sendActivityUpdated,
  sendActivityCancelled,
  sendNewActivityToInterested,
} = require('../notifications/email.service');
const {
  sendActivityJoined, sendActivityNearby,
  sendActivityCancelled: pushActivityCancelled,
  sendActivityUpdated: pushActivityUpdated,
  sendParticipantLeft: pushParticipantLeft,
} = require('../notifications/push.service');
const { buildIcs } = require('./ics');

function isDatePast(data) {
  return new Date(data) < new Date(new Date().toDateString());
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Validazione difensiva degli input: senza questi check un payload malformato
// (orario mancante, tipo fuori enum, data invalida) farebbe crashare
// timeToMinutes o esplodere Postgres → 500 invece di un 400 chiaro.
function validateActivityInput({ tipo, data, orarioInizio, orarioFine }) {
  if (!ACTIVITY_TYPES.includes(tipo)) {
    throw { status: 400, code: 'INVALID_TIPO', error: `tipo must be one of: ${ACTIVITY_TYPES.join(', ')}` };
  }
  if (!data || Number.isNaN(new Date(data).getTime())) {
    throw { status: 400, code: 'INVALID_DATE', error: 'data must be a valid date (YYYY-MM-DD)' };
  }
  if (!TIME_RE.test(orarioInizio || '') || !TIME_RE.test(orarioFine || '')) {
    throw { status: 400, code: 'INVALID_TIME', error: 'orarioInizio and orarioFine must be in HH:MM format' };
  }
}

// Pagina/limite sempre numerici e sensati: Number('abc') = NaN produrrebbe
// un OFFSET NaN in SQL (500), e un limit arbitrario permetterebbe dump completi.
function sanitizePagination(page, limit, defaultLimit = 20) {
  page = Number(page);
  limit = Number(limit);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > 100) limit = 100;
  return { page: Math.floor(page), limit: Math.floor(limit) };
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function getParticipantEmails(activityId, excludeUserId = null) {
  if (typeof Participation.findAll !== 'function') return [];
  const parts = await Participation.findAll({
    where: { activityId },
    include: [{ model: User, attributes: ['id', 'email'] }],
  });
  return parts
    .map((p) => p.User)
    .filter((u) => u && u.email && u.id !== excludeUserId)
    .map((u) => u.email);
}

async function getParticipantIds(activityId, excludeUserId = null) {
  if (typeof Participation.findAll !== 'function') return [];
  const parts = await Participation.findAll({
    where: { activityId },
    attributes: ['userId'],
  });
  return parts
    .map((p) => p.userId)
    .filter((id) => id && id !== excludeUserId);
}

async function createActivity(creatorId, { tipo, data, orarioInizio, orarioFine, maxPartecipanti, latitudine, longitudine, poiId }) {
  validateActivityInput({ tipo, data, orarioInizio, orarioFine });

  // OCL C9: start date must not be in the past
  if (isDatePast(data)) {
    throw { status: 400, code: 'DATE_IN_PAST', error: 'Activity date must not be in the past' };
  }

  // OCL C11: end time must be after start time
  if (timeToMinutes(orarioFine) <= timeToMinutes(orarioInizio)) {
    throw { status: 400, code: 'INVALID_TIME', error: 'End time must be after start time' };
  }

  // OCL C8: maxPartecipanti 2-50 (also enforced at model level).
  // Number() esplicito: undefined/"abc" passerebbero i confronti (< e > con NaN
  // sono sempre false) creando attività senza capienza → join illimitati.
  maxPartecipanti = Number(maxPartecipanti);
  if (!Number.isFinite(maxPartecipanti) || maxPartecipanti < 2 || maxPartecipanti > 50) {
    throw { status: 400, code: 'INVALID_MAX_PARTECIPANTI', error: 'maxPartecipanti must be between 2 and 50' };
  }

  // Resolve coordinates from the linked POI when caller didn't pass explicit coords.
  // This is the common path from the UI (user clicks a POI on the map and creates an activity).
  if ((latitudine == null || longitudine == null) && poiId) {
    const poi = await POI.findByPk(poiId, { attributes: ['latitudine', 'longitudine'] });
    if (poi) {
      latitudine = poi.latitudine;
      longitudine = poi.longitudine;
    }
  }

  // OCL C10: creator auto-joins as first participant
  const activity = await Activity.create({
    tipo, data, orarioInizio, orarioFine, maxPartecipanti,
    stato: 'attiva', creatorId, latitudine, longitudine, poiId,
  });
  await Participation.create({ userId: creatorId, activityId: activity.id });
  if (latitudine && longitudine) {
    reverseGeocode(latitudine, longitudine)
      .then((address) => { if (address) activity.update({ indirizzo: address }); })
      .catch(() => {});
  }

  // RF40: push to nearby users with matching interest.
  // If the activity has no explicit coords, fall back to the creator's last known location.
  (async () => {
    let pushLat = latitudine;
    let pushLng = longitudine;
    if (pushLat == null || pushLng == null) {
      const creator = await User.findByPk(creatorId, { attributes: ['lastLat', 'lastLng'] });
      pushLat = creator?.lastLat;
      pushLng = creator?.lastLng;
    }
    sendActivityNearby({
      activityId: activity.id,
      tipo: activity.tipo,
      lat: pushLat,
      lng: pushLng,
      creatorId,
      radiusKm: 50,
    }).catch(() => {});
  })().catch(() => {});

  // Email fallback: notify all users with matching interest regardless of location
  User.findAll({
    where: {
      ruolo: 'UtenteRegistrato',
      interessi: { [Op.contains]: [tipo] },
      id: { [Op.ne]: creatorId },
    },
    attributes: ['email'],
  }).then((users) => {
    const emails = users.map((u) => u.email).filter(Boolean);
    if (emails.length) sendNewActivityToInterested(emails, tipo, activity.id).catch(() => {});
  }).catch(() => {});

  return activity;
}

async function listActivities({ tipo, q, userInterests, page, limit, requesterId = null }) {
  ({ page, limit } = sanitizePagination(page, limit));
  const where = { stato: 'attiva' };
  // Un valore fuori enum manderebbe in errore Postgres (500): filtra solo se valido.
  if (tipo && !ACTIVITY_TYPES.includes(tipo)) tipo = undefined;
  if (tipo) where.tipo = tipo;
  // RF9 / RF14: personalise by user interests if provided and no explicit filter
  if (!tipo && Array.isArray(userInterests) && userInterests.length) {
    where.tipo = { [Op.in]: userInterests };
  }
  const include = [
    { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome'] },
    {
      model: User, as: 'participants', attributes: ['id'], through: { attributes: [] },
      include: [{ model: UserSettings, as: 'settings', attributes: ['participationVisibility', 'showProfileInParticipants'] }],
    },
  ];
  // RF15: optional textual search via linked POI name
  if (q) {
    include.push({
      model: POI,
      as: 'poi',
      attributes: ['id', 'nome'],
      where: { nome: { [Op.iLike]: `%${q}%` } },
      required: true,
    });
  } else {
    include.push({ model: POI, as: 'poi', attributes: ['id', 'nome'] });
  }
  const { rows, count } = await Activity.findAndCountAll({
    where,
    include,
    distinct: true,
    limit,
    offset: (page - 1) * limit,
    order: [['data', 'ASC']],
  });
  return { activities: rows.map((r) => serializeActivity(r, requesterId)), total: count, page, limit };
}

async function getActivity(id, requesterId = null) {
  const activity = await Activity.findByPk(id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome', 'email'] },
      {
        model: User, as: 'participants', attributes: ['id', 'nome', 'cognome'],
        through: { attributes: [] },
        include: [{ model: UserSettings, as: 'settings', attributes: ['participationVisibility', 'showProfileInParticipants'] }],
      },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] },
    ],
  });
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
  return serializeActivity(activity, requesterId);
}

async function updateActivity(userId, activityId, updates) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };

  // OCL C12: only creator can modify, only before start date
  if (activity.creatorId !== userId) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only the creator can modify this activity' };
  }
  if (isDatePast(activity.data)) {
    throw { status: 400, code: 'ACTIVITY_STARTED', error: 'Cannot modify an activity that has already started' };
  }

  if (updates.data && isDatePast(updates.data)) {
    throw { status: 400, code: 'DATE_IN_PAST', error: 'Activity date must not be in the past' };
  }
  if (updates.orarioInizio || updates.orarioFine) {
    // Confronta con i valori correnti quando ne viene aggiornato uno solo:
    // prima il check scattava solo se entrambi erano nel payload, permettendo
    // ad es. di spostare orarioFine prima di orarioInizio.
    const inizio = updates.orarioInizio ?? activity.orarioInizio;
    const fine = updates.orarioFine ?? activity.orarioFine;
    if (!TIME_RE.test(inizio || '') || !TIME_RE.test(fine || '')) {
      throw { status: 400, code: 'INVALID_TIME', error: 'orarioInizio and orarioFine must be in HH:MM format' };
    }
    if (timeToMinutes(fine) <= timeToMinutes(inizio)) {
      throw { status: 400, code: 'INVALID_TIME', error: 'End time must be after start time' };
    }
  }
  if (updates.maxPartecipanti != null) {
    // Number() esplicito come in createActivity: una stringa non numerica
    // supererebbe i confronti (NaN < 2 è false) e finirebbe in Postgres → 500.
    const max = Number(updates.maxPartecipanti);
    if (!Number.isFinite(max) || max < 2 || max > 50) {
      throw { status: 400, code: 'INVALID_MAX_PARTECIPANTI', error: 'maxPartecipanti must be between 2 and 50' };
    }
    // Coerenza conteggi: non si può abbassare la capienza sotto gli iscritti
    // attuali, altrimenti il frontend mostrerebbe 12/10.
    const current = await Participation.count({ where: { activityId } });
    if (Number.isFinite(current) && current > max) {
      throw { status: 400, code: 'MAX_BELOW_PARTICIPANTS', error: `maxPartecipanti cannot be lower than current participants (${current})` };
    }
    updates.maxPartecipanti = Math.floor(max);
  }

  // Mass-assignment guard: solo i campi qui sotto sono modificabili.
  // Senza whitelist, un attaccante autenticato potrebbe passare creatorId,
  // stato, id e impossessarsi/manipolare l'attività.
  const ALLOWED_UPDATE_FIELDS = ['tipo', 'data', 'orarioInizio', 'orarioFine', 'maxPartecipanti', 'latitudine', 'longitudine', 'poiId'];
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED_UPDATE_FIELDS.includes(k))
  );
  await activity.update(safeUpdates);

  // RF19: notify registered participants (excluding the creator who triggered the change)
  const emails = await getParticipantEmails(activityId, userId);
  sendActivityUpdated(emails, activity.tipo).catch(() => {});
  const ids = await getParticipantIds(activityId, userId);
  pushActivityUpdated(ids, activity.tipo, activity.id).catch(() => {});

  return activity;
}

async function cancelActivity(userId, activityId) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
  if (activity.creatorId !== userId) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only the creator can cancel this activity' };
  }

  // Capture participant ids BEFORE cancelling — we still want to reach them.
  const ids = await getParticipantIds(activityId, userId);
  const emails = await getParticipantEmails(activityId, userId);

  await activity.update({ stato: 'cancellata' });

  sendActivityCancelled(emails, activity.tipo).catch(() => {});
  pushActivityCancelled(ids, activity.tipo, activity.id).catch(() => {});
}

async function joinActivity(userId, activityId) {
  const activity = await Activity.findByPk(activityId, {
    include: [
      { model: User, as: 'participants', attributes: ['id'] },
      { model: User, as: 'creator', attributes: ['id', 'email'] },
    ],
  });
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
  if (activity.stato !== 'attiva') {
    throw { status: 400, code: 'ACTIVITY_NOT_ACTIVE', error: 'Activity is not active' };
  }
  if (isDatePast(activity.data)) {
    throw { status: 400, code: 'ACTIVITY_STARTED', error: 'Activity has already started' };
  }

  // OCL C18: doppia partecipazione → 409 chiaro, PRIMA del check capienza
  // (altrimenti chi è già iscritto a un'attività piena riceverebbe ACTIVITY_FULL).
  if (typeof Participation.findOne === 'function') {
    const existing = await Participation.findOne({ where: { userId, activityId } });
    if (existing) {
      throw { status: 409, code: 'ALREADY_JOINED', error: 'Already joined this activity' };
    }
  }

  // OCL C13: spots must be available
  const count = await Participation.count({ where: { activityId } });
  if (count >= activity.maxPartecipanti) {
    throw { status: 400, code: 'ACTIVITY_FULL', error: 'Activity is full' };
  }

  // OCL C18: unique constraint come rete di sicurezza contro le race condition
  let created;
  try {
    created = await Participation.create({ userId, activityId });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, code: 'ALREADY_JOINED', error: 'Already joined this activity' };
    }
    throw e;
  }

  // Guardia anti-race sulla capienza (OCL C13): se due utenti diversi superano
  // insieme il check `count >= max`, il riconteggio post-insert rileva lo
  // sforamento e l'iscrizione viene compensata invece di superare il limite.
  const afterCount = await Participation.count({ where: { activityId } });
  if (Number.isFinite(afterCount) && afterCount > activity.maxPartecipanti) {
    if (created && typeof created.destroy === 'function') await created.destroy();
    throw { status: 400, code: 'ACTIVITY_FULL', error: 'Activity is full' };
  }

  // RF11: notify creator + send confirmation to participant
  const participant = await User.findByPk(userId, { attributes: ['email', 'nome', 'cognome'] });
  if (participant && activity.creator && activity.creator.id !== userId) {
    const participantName = `${participant.nome} ${participant.cognome}`;
    sendActivityNewParticipant(activity.creator.email, activity.tipo, participantName).catch(() => {});
    // RF40: push notification on top of email
    sendActivityJoined(activity.creator.id, activity.tipo, participantName).catch(() => {});
  }
  if (participant) {
    sendActivityJoinConfirmation(participant.email, activity.tipo, activity.data).catch(() => {});
  }

  // OCL C14: user is now in participants list
  return getActivity(activityId);
}

async function leaveActivity(userId, activityId) {
  const participation = await Participation.findOne({ where: { userId, activityId } });
  if (!participation) {
    throw { status: 404, code: 'NOT_FOUND', error: 'Participation not found' };
  }

  const activity = await Activity.findByPk(activityId);
  // Guardia: una Participation orfana (attività rimossa) farebbe esplodere
  // `activity.creatorId` con un TypeError → 500.
  if (!activity) {
    await participation.destroy();
    return;
  }
  if (activity.creatorId === userId) {
    throw { status: 400, code: 'CREATOR_CANNOT_LEAVE', error: 'Creator cannot leave the activity; cancel it instead' };
  }

  // OCL C19: decrement is implicit via destroy
  await participation.destroy();

  // RF17: notify other participants of the cancellation (email + push)
  const leaver = await User.findByPk(userId, { attributes: ['nome', 'cognome'] });
  const emails = await getParticipantEmails(activityId);
  const ids = await getParticipantIds(activityId);
  if (leaver) {
    const leaverName = `${leaver.nome} ${leaver.cognome}`;
    sendActivityParticipantLeft(emails, activity.tipo, leaverName).catch(() => {});
    pushParticipantLeft(ids, activity.tipo, leaverName, activity.id).catch(() => {});
  }
}

// RF12 / RF49: calendar export
async function getActivityIcs(id) {
  const activity = await Activity.findByPk(id, { include: [{ model: POI, as: 'poi', attributes: ['nome'] }] });
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
  return buildIcs({
    uid: `activity-${activity.id}`,
    summary: `Attività: ${activity.tipo}`,
    description: `Attività spontanea di ${activity.tipo} su Trento Live Activity`,
    location: activity.poi?.nome || (activity.latitudine && activity.longitudine ? `${activity.latitudine},${activity.longitudine}` : ''),
    dateStr: activity.data,
    startTime: activity.orarioInizio,
    endTime: activity.orarioFine,
  });
}

module.exports = {
  createActivity,
  listActivities,
  getActivity,
  updateActivity,
  cancelActivity,
  joinActivity,
  leaveActivity,
  getActivityIcs,
};
