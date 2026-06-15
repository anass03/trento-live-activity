const router = require('express').Router();
const ctrl = require('./dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { ServiceRequest } = require('../data/models');

// OCL C25: caricaStatistiche requires AmministratoreComunale
router.get('/stats', authenticate, authorize('AmministratoreComunale'), ctrl.getStats);
// RF30: export stats as CSV/PDF (?datasets=kpi,activities,poi_crowding,poi_inventory,supply_demand,citizen_needs)
router.get('/stats/export', authenticate, authorize('AmministratoreComunale'), ctrl.exportStats);
// Aggregated citizen service requests (scope ridotto: no userId, no personal data)
router.get('/service-requests', authenticate, authorize('AmministratoreComunale'), ctrl.getServiceRequestStats);
// Recent individual service requests for the log feed (no personal data: no userId)
router.get('/service-requests/recent', authenticate, authorize('AmministratoreComunale'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const rows = await ServiceRequest.findAll({
      attributes: ['id', 'categoria', 'sottocategoria', 'indirizzo', 'latitudine', 'longitudine', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit,
      raw: true,
    });
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
