const { Event, User } = require('../data/models');

async function createEvent(entityId, { titolo, descrizione, categoria, latitudine, longitudine, poiId, data, orarioInizio, orarioFine }) {
  const entity = await User.findByPk(entityId);
  if (!entity) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  // OCL C15, C24: only approved certified entities can publish
  if (entity.ruolo !== 'EnteCertificato' || !entity.approvato) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only approved certified entities can publish events' };
  }

  // OCL C17: title non-empty, <= 100 chars (also enforced at model level)
  if (!titolo || titolo.length === 0 || titolo.length > 100) {
    throw { status: 400, code: 'INVALID_TITLE', error: 'Title must be between 1 and 100 characters' };
  }

  // OCL C16: badgeVerifica = true after pubblica()
  const event = await Event.create({
    titolo, descrizione, categoria, badgeVerifica: true,
    entityId, latitudine, longitudine, poiId, data, orarioInizio, orarioFine,
  });
  return event;
}

async function listEvents({ categoria, page = 1, limit = 20 }) {
  const where = {};
  if (categoria) where.categoria = categoria;
  const { rows, count } = await Event.findAndCountAll({
    where,
    include: [{ model: User, as: 'entity', attributes: ['id', 'nome', 'nomeEnte'] }],
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });
  return { events: rows, total: count, page, limit };
}

async function getEvent(id) {
  const event = await Event.findByPk(id, {
    include: [{ model: User, as: 'entity', attributes: ['id', 'nome', 'nomeEnte'] }],
  });
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };
  return event;
}

async function updateEvent(entityId, eventId, updates) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };
  if (event.entityId !== entityId) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only the publishing entity can modify this event' };
  }
  if (updates.titolo !== undefined && (updates.titolo.length === 0 || updates.titolo.length > 100)) {
    throw { status: 400, code: 'INVALID_TITLE', error: 'Title must be between 1 and 100 characters' };
  }
  await event.update(updates);
  return event;
}

module.exports = { createEvent, listEvents, getEvent, updateEvent };
