const service = require('./event.service');
const { assertUuid } = require('../data/presenters');

async function create(req, res, next) {
  try {
    const event = await service.createEvent(req.user.id, req.body);
    res.status(201).json(event);
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { categoria, q, page, limit } = req.query;
    const result = await service.listEvents({
      categoria,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    assertUuid(req.params.id, 'event id');
    const event = await service.getEvent(req.params.id);
    res.json(event);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    assertUuid(req.params.id, 'event id');
    const event = await service.updateEvent(req.user.id, req.params.id, req.body);
    res.json(event);
  } catch (e) { next(e); }
}

async function stats(req, res, next) {
  try {
    assertUuid(req.params.id, 'event id');
    const result = await service.getEventStats(req.user.id, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

async function listMine(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await service.listEntityEvents(req.user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  } catch (e) { next(e); }
}

async function calendar(req, res, next) {
  try {
    assertUuid(req.params.id, 'event id');
    const ics = await service.getEventIcs(req.params.id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${req.params.id}.ics"`);
    res.send(ics);
  } catch (e) { next(e); }
}

module.exports = { create, list, get, update, stats, listMine, calendar };
