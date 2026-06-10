const service = require('./moderation.service');

async function createReport(req, res, next) {
  try {
    const result = await service.createSocialReport(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function listReports(req, res, next) {
  try {
    const result = await service.listAdminReports(req.query);
    res.json(result);
  } catch (e) { next(e); }
}

async function patchReport(req, res, next) {
  try {
    const result = await service.resolveReport(req.params.reportId, req.body);
    res.json(result);
  } catch (e) { next(e); }
}

async function hideItem(req, res, next) {
  try {
    const result = await service.applyModerationAction('HIDE', req.body);
    res.json(result);
  } catch (e) { next(e); }
}

async function removeItem(req, res, next) {
  try {
    const result = await service.applyModerationAction('REMOVE', req.body);
    res.json(result);
  } catch (e) { next(e); }
}

async function restoreItem(req, res, next) {
  try {
    const result = await service.applyModerationAction('RESTORE', req.body);
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = {
  createReport,
  listReports,
  patchReport,
  hideItem,
  removeItem,
  restoreItem,
};
