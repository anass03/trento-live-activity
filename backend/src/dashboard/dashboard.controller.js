const service = require('./dashboard.service');

async function getStats(req, res, next) {
  try {
    const stats = await service.getStats(req.query);
    res.json(stats);
  } catch (e) { next(e); }
}

async function exportStats(req, res, next) {
  try {
    const stats = await service.getStats(req.query);
    const format = (req.query.format || 'csv').toLowerCase();

    if (format === 'csv') {
      const rows = [
        ['metric', 'value'],
        ['totalUsers', stats.totalUsers],
        ['totalActivities', stats.totalActivities],
        ['totalEvents', stats.totalEvents],
        ['totalPOIs', stats.totalPOIs],
        ['totalParticipations', stats.totalParticipations],
        ...stats.activitiesByType.map((r) => [`activities_${r.tipo}`, r.count]),
        ...stats.poiCrowding.map((r) => [`poi_${r.statoAffollamento}`, r.count]),
      ];
      const csv = rows.map((r) => r.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stats.csv"');
      return res.send(csv);
    }

    res.status(400).json({ error: 'Unsupported format. Use ?format=csv', code: 'INVALID_FORMAT' });
  } catch (e) { next(e); }
}

module.exports = { getStats, exportStats };
