const service = require('./socialUser.service');

async function getTrust(req, res, next) {
  try {
    const result = await service.getUserTrustBreakdown(req.params.userId);
    res.json(result);
  } catch (e) { next(e); }
}

async function recalculateTrust(req, res, next) {
  try {
    const result = await service.manualRecalculateTrust(req.params.userId);
    res.json(result);
  } catch (e) { next(e); }
}

async function verify(req, res, next) {
  try {
    const result = await service.verifyAuthor(req.params.userId);
    res.json(result);
  } catch (e) { next(e); }
}

async function suspend(req, res, next) {
  try {
    const result = await service.suspendAuthor(req.params.userId);
    res.json(result);
  } catch (e) { next(e); }
}

async function getParticipations(req, res, next) {
  try {
    const result = await service.getMyParticipations(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
}

async function confirm(req, res, next) {
  try {
    const result = await service.confirmAttendance(req.user.id, req.params.participationId, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function noShow(req, res, next) {
  try {
    const result = await service.markNoShow(req.user.id, req.params.participationId, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function getEventParticipants(req, res, next) {
  try {
    const result = await service.getParticipantsList('EVENT', req.params.eventId, req.user?.id, req.user?.role || req.user?.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function getActivityParticipants(req, res, next) {
  try {
    const result = await service.getParticipantsList('ACTIVITY', req.params.activityId, req.user?.id, req.user?.role || req.user?.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function getSaved(req, res, next) {
  try {
    const result = await service.getMySavedItems(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
}

async function getUpcoming(req, res, next) {
  try {
    const result = await service.getMyUpcomingItems(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
}

async function getRecommendations(req, res, next) {
  try {
    const result = await service.getPersonalizedRecommendations(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = {
  getTrust,
  recalculateTrust,
  verify,
  suspend,
  getParticipations,
  confirm,
  noShow,
  getEventParticipants,
  getActivityParticipants,
  getSaved,
  getUpcoming,
  getRecommendations,
};
