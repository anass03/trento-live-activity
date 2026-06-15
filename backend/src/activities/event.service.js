const { Op } = require('sequelize');
const { Event, User, Report, POI, EventParticipation } = require('../data/models');
const { sendNewEventToInterested: sendNewEventPush } = require('../notifications/push.service');
const { sendNewEventToInterested: sendNewEventEmail } = require('../notifications/email.service');
const { serializeEvent } = require('../data/presenters');
const { buildIcs } = require('./ics');
const { reverseGeocode } = require('../lib/geocode');
const { EVENT_CATEGORIES } = require('../data/models/Event');

// Confronto a mezzanotte locale (come isDatePast in activity.service): usare la
// data UTC (toISOString) permetteva di iscriversi a eventi già passati tra le
// 00:00 e le 02:00 ora locale.
function isDatePast(data) {
  return new Date(data) < new Date(new Date().toDateString());
}

// Pagina/limite sempre numerici e sensati: Number('abc') = NaN dal controller
// produrrebbe un OFFSET NaN in SQL (500).
function sanitizePagination(page, limit, defaultLimit = 20) {
  page = Number(page);
  limit = Number(limit);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > 100) limit = 100;
  return { page: Math.floor(page), limit: Math.floor(limit) };
}

async function createEvent(entityId, { titolo, descrizione, categoria, latitudine, longitudine, poiId, data, orarioInizio, orarioFine, maxPartecipanti }) {
  const entity = await User.findByPk(entityId);
  if (!entity) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  // OCL C15, C24: only approved certified entities can publish
  if (entity.ruolo !== 'EnteCertificato' || !entity.approvato) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only approved certified entities can publish events' };
  }

  // OCL C17: title non-empty, <= 100 chars (also enforced at model level)
  if (!titolo || typeof titolo !== 'string' || titolo.length === 0 || titolo.length > 100) {
    throw { status: 400, code: 'INVALID_TITLE', error: 'Title must be between 1 and 100 characters' };
  }

  // Una categoria fuori enum farebbe esplodere l'INSERT su Postgres → 500.
  if (!EVENT_CATEGORIES.includes(categoria)) {
    throw { status: 400, code: 'INVALID_CATEGORIA', error: `categoria must be one of: ${EVENT_CATEGORIES.join(', ')}` };
  }

  // Coercizione esplicita: "abc" o valori negativi non devono diventare un cap.
  maxPartecipanti = Number(maxPartecipanti);
  maxPartecipanti = Number.isFinite(maxPartecipanti) && maxPartecipanti > 0
    ? Math.floor(maxPartecipanti)
    : null;

  // Resolve coordinates from the linked POI when caller didn't pass explicit coords.
  if ((latitudine == null || longitudine == null) && poiId) {
    const poi = await POI.findByPk(poiId, { attributes: ['latitudine', 'longitudine'] });
    if (poi) {
      latitudine = poi.latitudine;
      longitudine = poi.longitudine;
    }
  }

  // OCL C16: badgeVerifica = true after pubblica()
  const event = await Event.create({
    titolo, descrizione, categoria, badgeVerifica: true,
    entityId, latitudine, longitudine, poiId, data, orarioInizio, orarioFine,
    maxPartecipanti,
  });

  // Geocode coordinates and store for instant display on frontend (fire-and-forget).
  if (latitudine && longitudine) {
    reverseGeocode(latitudine, longitudine)
      .then((address) => { if (address) event.update({ indirizzo: address }); })
      .catch(() => {});
  }

  // RF40: push + email to users with matching interest
  sendNewEventPush(event.id, categoria, titolo).catch(() => {});
  User.findAll({
    where: { ruolo: 'UtenteRegistrato', interessi: { [Op.contains]: [categoria] } },
    attributes: ['email'],
  }).then((users) => {
    const emails = users.map((u) => u.email);
    if (emails.length) sendNewEventEmail(emails, titolo, categoria, event.id).catch(() => {});
  }).catch(() => {});

  return event;
}

async function listEvents({ categoria, q, page, limit }) {
  ({ page, limit } = sanitizePagination(page, limit));
  // Exclude cancelled/ended events from public listing
  const where = { status: { [Op.notIn]: ['CANCELLED', 'ENDED'] } };
  // Un valore fuori enum manderebbe in errore Postgres (500): filtra solo se valido.
  if (categoria && EVENT_CATEGORIES.includes(categoria)) where.categoria = categoria;
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
      { model: User, as: 'eventParticipants', attributes: ['id'], through: { attributes: [] } },
    ],
    distinct: true,
    limit,
    offset: (page - 1) * limit,
    order: [['startDateTime', 'ASC'], ['createdAt', 'ASC']],
  });
  return { events: rows.map(serializeEvent), total: count, page, limit };
}

async function getEvent(id) {
  const event = await Event.findByPk(id, {
    include: [
      { model: User, as: 'entity', attributes: ['id', 'nome', 'cognome', 'nomeEnte'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] },
      { model: User, as: 'eventParticipants', attributes: ['id'], through: { attributes: [] } },
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
  // typeof check: prima `updates.titolo.length` su titolo:null lanciava un
  // TypeError non gestito → 500 invece di un 400 chiaro.
  if (updates.titolo !== undefined && (typeof updates.titolo !== 'string' || updates.titolo.length === 0 || updates.titolo.length > 100)) {
    throw { status: 400, code: 'INVALID_TITLE', error: 'Title must be between 1 and 100 characters' };
  }
  if (updates.categoria !== undefined && !EVENT_CATEGORIES.includes(updates.categoria)) {
    throw { status: 400, code: 'INVALID_CATEGORIA', error: `categoria must be one of: ${EVENT_CATEGORIES.join(', ')}` };
  }
  // maxPartecipanti: null/'' rimuove il limite; altrimenti deve essere un intero
  // positivo e non inferiore agli iscritti attuali (altrimenti il conteggio
  // mostrato al frontend diventa incoerente: 12/10).
  if (updates.maxPartecipanti !== undefined) {
    if (updates.maxPartecipanti === null || updates.maxPartecipanti === '') {
      updates.maxPartecipanti = null;
    } else {
      const max = Number(updates.maxPartecipanti);
      if (!Number.isFinite(max) || max < 1) {
        throw { status: 400, code: 'INVALID_MAX_PARTECIPANTI', error: 'maxPartecipanti must be a positive integer' };
      }
      const current = await EventParticipation.count({ where: { eventId } });
      if (current > max) {
        throw { status: 400, code: 'MAX_BELOW_PARTICIPANTS', error: `maxPartecipanti cannot be lower than current participants (${current})` };
      }
      updates.maxPartecipanti = Math.floor(max);
    }
  }
  // Mass-assignment guard: senza whitelist un ente potrebbe passare entityId
  // (riassegnare l'evento a un altro ente), badgeVerifica:false, id, ecc.
  const ALLOWED_UPDATE_FIELDS = ['titolo', 'descrizione', 'categoria', 'latitudine', 'longitudine', 'poiId', 'data', 'orarioInizio', 'orarioFine', 'maxPartecipanti'];
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED_UPDATE_FIELDS.includes(k))
  );
  await event.update(safeUpdates);
  return event;
}

// Entity cancels their own event. Reports must be destroyed first because the
// reports.eventId FK is NOT NULL with no ON DELETE CASCADE.
async function deleteEvent(entityId, eventId) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };
  if (event.entityId !== entityId) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only the publishing entity can delete this event' };
  }
  const eventTitolo = event.titolo;
  await Report.destroy({ where: { eventId } });
  await event.destroy();
  // The entity already knows; we only notify the entity if the deletion was
  // moderation-driven (handled in moderation.service). No notification here.
  return { message: 'Event deleted', titolo: eventTitolo };
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
async function listEntityEvents(entityId, { page, limit } = {}) {
  ({ page, limit } = sanitizePagination(page, limit));
  const { rows, count } = await Event.findAndCountAll({
    where: { entityId },
    include: [{ model: POI, as: 'poi', attributes: ['id', 'nome'] }],
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });
  return { events: rows.map(serializeEvent), total: count, page, limit };
}

// Iscrizione di un cittadino a un evento certificato.
// Vincoli:
//   - evento esistente e non passato
//   - utente non già iscritto (l'indice UNIQUE su (userId, eventId) lo garantisce a livello DB)
//   - se l'evento ha maxPartecipanti, non si superi il limite
async function joinEvent(userId, eventId) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };
  if (event.data && isDatePast(event.data)) {
    throw { status: 400, code: 'EVENT_PAST', error: 'Non puoi partecipare a un evento passato' };
  }
  const existing = await EventParticipation.findOne({ where: { userId, eventId } });
  if (existing) {
    throw { status: 409, code: 'ALREADY_PARTICIPATING', error: 'Sei già iscritto a questo evento' };
  }
  if (event.maxPartecipanti) {
    const count = await EventParticipation.count({ where: { eventId } });
    if (count >= event.maxPartecipanti) {
      throw { status: 409, code: 'EVENT_FULL', error: 'Posti esauriti per questo evento' };
    }
  }
  // L'indice UNIQUE su (userId, eventId) è la rete di sicurezza contro la doppia
  // iscrizione concorrente: senza questo catch la violazione diventava un 500.
  let created;
  try {
    created = await EventParticipation.create({ userId, eventId });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, code: 'ALREADY_PARTICIPATING', error: 'Sei già iscritto a questo evento' };
    }
    throw e;
  }
  const participantCount = await EventParticipation.count({ where: { eventId } });
  // Guardia anti-race sulla capienza: se due utenti diversi superano insieme il
  // check `count >= max`, il riconteggio post-insert rileva lo sforamento e
  // l'ultimo arrivato viene rimosso (compensazione) invece di sforare il limite.
  if (event.maxPartecipanti && participantCount > event.maxPartecipanti) {
    if (created && typeof created.destroy === 'function') await created.destroy();
    throw { status: 409, code: 'EVENT_FULL', error: 'Posti esauriti per questo evento' };
  }
  return { eventId, joined: true, participantCount, maxPartecipanti: event.maxPartecipanti };
}

async function leaveEvent(userId, eventId) {
  const removed = await EventParticipation.destroy({ where: { userId, eventId } });
  if (!removed) {
    throw { status: 404, code: 'NOT_PARTICIPATING', error: 'Non sei iscritto a questo evento' };
  }
  const participantCount = await EventParticipation.count({ where: { eventId } });
  return { eventId, joined: false, participantCount };
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
  deleteEvent,
  getEventStats,
  listEntityEvents,
  getEventIcs,
  joinEvent,
  leaveEvent,
};
