const service = require('./activity.service');
const { User } = require('../data/models');

async function create(req, res, next) {
  try {
    const activity = await service.createActivity(req.user.id, req.body);
    res.status(201).json(activity);
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { tipo, q, page, limit, mine } = req.query;
    let userInterests;
    // RF9: if "mine=interests" and user is authenticated, filter by their interests
    if (mine === 'interests' && req.user) {
      const user = await User.findByPk(req.user.id, { attributes: ['interessi'] });
      userInterests = user?.interessi || [];
    }
    const result = await service.listActivities({
      tipo,
      q,
      userInterests,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
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

async function calendar(req, res, next) {
  try {
    const ics = await service.getActivityIcs(req.params.id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="activity-${req.params.id}.ics"`);
    res.send(ics);
  } catch (e) { next(e); }
}

module.exports = { create, list, get, update, cancel, join, leave, calendar };
