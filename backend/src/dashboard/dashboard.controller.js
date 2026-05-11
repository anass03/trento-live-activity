const service = require('./dashboard.service');

async function getStats(req, res, next) {
  try {
    const stats = await service.getStats(req.query);
    res.json(stats);
  } catch (e) { next(e); }
}

module.exports = { getStats };
