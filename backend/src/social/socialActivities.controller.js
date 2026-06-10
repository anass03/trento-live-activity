const service = require('./socialActivities.service');

async function list(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.listActivities(currentUserId, req.query);
    res.json(result);
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getActivitySocial(currentUserId, req.params.activityId);
    res.json(result);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const result = await service.createActivitySocial(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const result = await service.updateActivitySocial(req.user.id, req.params.activityId, req.body, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const result = await service.deleteActivitySocial(req.user.id, req.params.activityId, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function join(req, res, next) {
  try {
    const result = await service.joinActivitySocial(req.user.id, req.params.activityId);
    res.json(result);
  } catch (e) { next(e); }
}

async function leave(req, res, next) {
  try {
    const result = await service.leaveActivitySocial(req.user.id, req.params.activityId);
    res.json(result);
  } catch (e) { next(e); }
}

async function save(req, res, next) {
  try {
    const result = await service.toggleSaveActivity(req.user.id, req.params.activityId, true);
    res.json(result);
  } catch (e) { next(e); }
}

async function unsave(req, res, next) {
  try {
    const result = await service.toggleSaveActivity(req.user.id, req.params.activityId, false);
    res.json(result);
  } catch (e) { next(e); }
}

async function getRecommended(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getRecommendedActivities(currentUserId);
    res.json(result);
  } catch (e) { next(e); }
}

async function getPerfectNow(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getPerfectNowActivities(currentUserId);
    res.json(result);
  } catch (e) { next(e); }
}

async function getRising(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getRisingActivities(currentUserId);
    res.json(result);
  } catch (e) { next(e); }
}

async function getVerified(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getVerifiedActivities(currentUserId);
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  join,
  leave,
  save,
  unsave,
  getRecommended,
  getPerfectNow,
  getRising,
  getVerified,
};
