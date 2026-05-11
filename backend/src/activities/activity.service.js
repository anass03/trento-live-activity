const { Activity, Participation, User } = require('../data/models');

function isDatePast(data) {
  return new Date(data) < new Date(new Date().toDateString());
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
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

async function listActivities({ tipo, page = 1, limit = 20 }) {
  const where = { stato: 'attiva' };
  if (tipo) where.tipo = tipo;
  const { rows, count } = await Activity.findAndCountAll({
    where,
    include: [{ model: User, as: 'creator', attributes: ['id', 'nome', 'cognome'] }],
    limit,
    offset: (page - 1) * limit,
    order: [['data', 'ASC']],
  });
  return { activities: rows, total: count, page, limit };
}

async function getActivity(id) {
  const activity = await Activity.findByPk(id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome'] },
      { model: User, as: 'participants', attributes: ['id', 'nome', 'cognome'] },
    ],
  });
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
  return activity;
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
  return activity;
}

async function cancelActivity(userId, activityId) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
  if (activity.creatorId !== userId) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only the creator can cancel this activity' };
  }
  await activity.update({ stato: 'cancellata' });
}

async function joinActivity(userId, activityId) {
  const activity = await Activity.findByPk(activityId, {
    include: [{ model: User, as: 'participants', attributes: ['id'] }],
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
}

module.exports = { createActivity, listActivities, getActivity, updateActivity, cancelActivity, joinActivity, leaveActivity };
