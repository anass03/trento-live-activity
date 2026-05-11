const service = require('./moderation.service');

async function createReport(req, res, next) {
  try {
    const report = await service.createReport(req.user.id, req.params.eventId, req.body);
    res.status(201).json(report);
  } catch (e) { next(e); }
}

async function listReports(req, res, next) {
  try { res.json(await service.listReports(req.query)); } catch (e) { next(e); }
}

async function getReport(req, res, next) {
  try { res.json(await service.getReport(req.params.id)); } catch (e) { next(e); }
}

async function resolveReport(req, res, next) {
  try { res.json(await service.resolveReport(req.params.id, req.body)); } catch (e) { next(e); }
}

module.exports = { createReport, listReports, getReport, resolveReport };
