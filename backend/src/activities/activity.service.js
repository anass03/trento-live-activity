const { Op } = require('sequelize');
const { Activity, Participation, User, POI } = require('../data/models');
const { serializeActivity } = require('../data/presenters');
const {
  sendActivityJoinConfirmation,
  sendActivityNewParticipant,
  sendActivityParticipantLeft,
  sendActivityUpdated,
  sendActivityCancelled,
} = require('../notifications/email.service');
const { sendActivityJoined } = require('../notifications/push.service');
const { buildIcs } = require('./ics');

function isDatePast(data) {
  return new Date(data) < new Date(new Date().toDateString());
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

async function createActivity(creatorId, { tipo, data, orarioInizio, orarioFine, maxPartecipanti, latitudine, longitudine, poiId }) {
  // OCL C9: start date must not be in the past
  if (isDatePast(data)) {
    throw { status: 400, code: 'DATE_IN_PAST', error: 'Activity date must not be in the past' };
  }

  // OCL C11: end time must be after start time
  if (timeToMinutes(orarioFine) <= timeToMinutes(orarioInizio)) {
    throw { status: 400, code: 'INVALID_TIME', error: 'End time must be after start time' };
  }

  // OCL C8: maxPartecipanti 2-50 (also enforced at model level)
  if (maxPartecipanti < 2 || maxPartecipanti > 50) {
    throw { status: 400, code: 'INVALID_MAX_PARTECIPANTI', error: 'maxPartecipanti must be between 2 and 50' };
  }

  // OCL C10: creator auto-joins as first participant
  const activity = await Activity.create({
    tipo, data, orarioInizio, orarioFine, maxPartecipanti,
    stato: 'attiva', creatorId, latitudine, longitudine, poiId,
  });
  await Participation.create({ userId: creatorId, activityId: activity.id });
  return activity;
}

async function listActivities({ tipo, q, userInterests, page = 1, limit = 20 }) {
  const where = { stato: 'attiva' };
  if (tipo) where.tipo = tipo;
  // RF9 / RF14: personalise by user interests if provided and no explicit filter
  if (!tipo && Array.isArray(userInterests) && userInterests.length) {
    where.tipo = { [Op.in]: userInterests };
  }
  const include = [
    { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome'] },
    { model: User, as: 'participants', attributes: ['id'], through: { attributes: [] } },
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
  return { activities: rows.map(serializeActivity), total: count, page, limit };
}

async function getActivity(id) {
  const activity = await Activity.findByPk(id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome', 'email'] },
      { model: User, as: 'participants', attributes: ['id', 'nome', 'cognome'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] },
    ],
  });
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
  return serializeActivity(activity);
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
  if (updates.orarioInizio && updates.orarioFine) {
    if (timeToMinutes(updates.orarioFine) <= timeToMinutes(updates.orarioInizio)) {
      throw { status: 400, code: 'INVALID_TIME', error: 'End time must be after start time' };
    }
  }

  await activity.update(updates);

  // RF19: notify registered participants (excluding the creator who triggered the change)
  const emails = await getParticipantEmails(activityId, userId);
  sendActivityUpdated(emails, activity.tipo).catch(() => {});

  return activity;
}

async function cancelActivity(userId, activityId) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
  if (activity.creatorId !== userId) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only the creator can cancel this activity' };
  }
  await activity.update({ stato: 'cancellata' });

  // Notify all participants except the creator
  const emails = await getParticipantEmails(activityId, userId);
  sendActivityCancelled(emails, activity.tipo).catch(() => {});
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

  // OCL C13: spots must be available
  const count = await Participation.count({ where: { activityId } });
  if (count >= activity.maxPartecipanti) {
    throw { status: 400, code: 'ACTIVITY_FULL', error: 'Activity is full' };
  }

  // OCL C18: unique constraint prevents duplicate joins
  try {
    await Participation.create({ userId, activityId });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, code: 'ALREADY_JOINED', error: 'Already joined this activity' };
    }
    throw e;
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
  if (activity.creatorId === userId) {
    throw { status: 400, code: 'CREATOR_CANNOT_LEAVE', error: 'Creator cannot leave the activity; cancel it instead' };
  }

  // OCL C19: decrement is implicit via destroy
  await participation.destroy();

  // RF17: notify other participants of the cancellation
  const leaver = await User.findByPk(userId, { attributes: ['nome', 'cognome'] });
  const emails = await getParticipantEmails(activityId);
  if (leaver) {
    sendActivityParticipantLeft(emails, activity.tipo, `${leaver.nome} ${leaver.cognome}`).catch(() => {});
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
