const service = require('./socialEvents.service');

async function getFeed(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.listEventsFeed(currentUserId, req.query);
    res.json(result);
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  // Map standard list to the same feed function, but can override parameters if needed
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.listEventsFeed(currentUserId, req.query);
    res.json(result);
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getEventSocial(currentUserId, req.params.eventId);
    res.json(result);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const result = await service.createEventSocial(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const result = await service.updateEventSocial(req.user.id, req.params.eventId, req.body, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const result = await service.deleteEventSocial(req.user.id, req.params.eventId, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function join(req, res, next) {
  try {
    const result = await service.joinEventSocial(req.user.id, req.params.eventId);
    res.json(result);
  } catch (e) { next(e); }
}

async function leave(req, res, next) {
  try {
    const result = await service.leaveEventSocial(req.user.id, req.params.eventId);
    res.json(result);
  } catch (e) { next(e); }
}

async function like(req, res, next) {
  try {
    const result = await service.toggleLikeEvent(req.user.id, req.params.eventId, true);
    res.json(result);
  } catch (e) { next(e); }
}

async function unlike(req, res, next) {
  try {
    const result = await service.toggleLikeEvent(req.user.id, req.params.eventId, false);
    res.json(result);
  } catch (e) { next(e); }
}

async function save(req, res, next) {
  try {
    const result = await service.toggleSaveEvent(req.user.id, req.params.eventId, true);
    res.json(result);
  } catch (e) { next(e); }
}

async function unsave(req, res, next) {
  try {
    const result = await service.toggleSaveEvent(req.user.id, req.params.eventId, false);
    res.json(result);
  } catch (e) { next(e); }
}

async function share(req, res, next) {
  try {
    const result = await service.shareEvent(req.params.eventId);
    res.json(result);
  } catch (e) { next(e); }
}

async function getTrending(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getTrendingEvents(currentUserId);
    res.json(result);
  } catch (e) { next(e); }
}

async function getNext(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getNextEvent(currentUserId);
    if (!result) return res.status(404).json({ error: 'No upcoming events found', code: 'NOT_FOUND' });
    res.json(result);
  } catch (e) { next(e); }
}

async function getLive(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await service.getLiveEvents(currentUserId);
    res.json(result);
  } catch (e) { next(e); }
}

async function getComments(req, res, next) {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const result = await service.listComments(req.params.eventId, page, limit);
    res.json(result);
  } catch (e) { next(e); }
}

async function addComment(req, res, next) {
  try {
    const result = await service.createComment(req.user.id, req.params.eventId, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function patchComment(req, res, next) {
  try {
    const result = await service.updateComment(req.user.id, req.params.commentId, req.body, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function removeComment(req, res, next) {
  try {
    const result = await service.deleteComment(req.user.id, req.params.commentId, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = {
  getFeed,
  list,
  get,
  create,
  update,
  remove,
  join,
  leave,
  like,
  unlike,
  save,
  unsave,
  share,
  getTrending,
  getNext,
  getLive,
  getComments,
  addComment,
  patchComment,
  removeComment,
};
