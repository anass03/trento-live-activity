const service = require('./activity.service');

async function create(req, res, next) {
  try {
    const activity = await service.createActivity(req.user.id, req.body);
    res.status(201).json(activity);
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const result = await service.listActivities(req.query);
    res.json(result);
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const activity = await service.getActivity(req.params.id);
    res.json(activity);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const activity = await service.updateActivity(req.user.id, req.params.id, req.body);
    res.json(activity);
  } catch (e) { next(e); }
}

async function cancel(req, res, next) {
  try {
    await service.cancelActivity(req.user.id, req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

async function join(req, res, next) {
  try {
    const activity = await service.joinActivity(req.user.id, req.params.id);
    res.json(activity);
  } catch (e) { next(e); }
}

async function leave(req, res, next) {
  try {
    await service.leaveActivity(req.user.id, req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { create, list, get, update, cancel, join, leave };
