const service = require('./event.service');

async function create(req, res, next) {
  try {
    const event = await service.createEvent(req.user.id, req.body);
    res.status(201).json(event);
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const result = await service.listEvents(req.query);
    res.json(result);
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const event = await service.getEvent(req.params.id);
    res.json(event);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const event = await service.updateEvent(req.user.id, req.params.id, req.body);
    res.json(event);
  } catch (e) { next(e); }
}

module.exports = { create, list, get, update };
