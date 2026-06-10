const service = require('./reviews.service');

async function list(req, res, next) {
  try {
    const sortBy = req.query.sortBy || 'newest';
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const result = await service.listReviews(req.params.activityId, sortBy, page, limit);
    res.json(result);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const result = await service.createReview(req.user.id, req.params.activityId, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const result = await service.updateReview(req.user.id, req.params.reviewId, req.body, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const result = await service.deleteReview(req.user.id, req.params.reviewId, req.user.ruolo);
    res.json(result);
  } catch (e) { next(e); }
}

async function report(req, res, next) {
  try {
    const result = await service.reportReview(req.user.id, req.params.reviewId, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function getUserSummary(req, res, next) {
  try {
    const result = await service.getUserReviewsSummary(req.params.userId);
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = {
  list,
  create,
  update,
  remove,
  report,
  getUserSummary,
};
