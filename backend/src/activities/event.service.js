const { Op } = require('sequelize');
const { Event, User, Report, POI } = require('../data/models');
const { serializeEvent } = require('../data/presenters');
const { buildIcs } = require('./ics');

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

async function listEvents({ categoria, q, page = 1, limit = 20 }) {
  const where = {};
  if (categoria) where.categoria = categoria;
  // RF15: textual search on titolo / descrizione
  if (q) {
    where[Op.or] = [
      { titolo: { [Op.iLike]: `%${q}%` } },
      { descrizione: { [Op.iLike]: `%${q}%` } },
    ];
  }
  const { rows, count } = await Event.findAndCountAll({
    where,
    include: [
      { model: User, as: 'entity', attributes: ['id', 'nome', 'cognome', 'nomeEnte'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] },
    ],
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });
  return { events: rows.map(serializeEvent), total: count, page, limit };
}

async function getEvent(id) {
  const event = await Event.findByPk(id, {
    include: [
      { model: User, as: 'entity', attributes: ['id', 'nome', 'cognome', 'nomeEnte'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] },
    ],
  });
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };
  // RF25: increment view counter (non-blocking)
  Event.increment('views', { by: 1, where: { id } }).catch(() => {});
  return serializeEvent(event);
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

// RF25: certified entities view stats for their own events
async function getEventStats(entityId, eventId) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };
  if (event.entityId !== entityId) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only the publishing entity can view stats for this event' };
  }
  const reportsCount = await Report.count({ where: { eventId } });
  return {
    eventId: event.id,
    titolo: event.titolo,
    views: event.views,
    reports: reportsCount,
    pubblicatoIl: event.createdAt,
  };
}

// Helper: certified entity lists their own published events
async function listEntityEvents(entityId, { page = 1, limit = 20 } = {}) {
  const { rows, count } = await Event.findAndCountAll({
    where: { entityId },
    include: [{ model: POI, as: 'poi', attributes: ['id', 'nome'] }],
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });
  return { events: rows.map(serializeEvent), total: count, page, limit };
}

// RF12 / RF49: calendar export
async function getEventIcs(id) {
  const event = await Event.findByPk(id, { include: [{ model: POI, as: 'poi', attributes: ['nome'] }] });
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };
  if (!event.data) throw { status: 400, code: 'NO_DATE', error: 'Event has no date set' };
  return buildIcs({
    uid: `event-${event.id}`,
    summary: event.titolo,
    description: event.descrizione,
    location: event.poi?.nome || (event.latitudine && event.longitudine ? `${event.latitudine},${event.longitudine}` : ''),
    dateStr: event.data,
    startTime: event.orarioInizio,
    endTime: event.orarioFine,
  });
}

module.exports = {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  getEventStats,
  listEntityEvents,
  getEventIcs,
};
