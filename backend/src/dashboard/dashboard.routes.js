const router = require('express').Router();
const ctrl = require('./dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');

// OCL C25: caricaStatistiche requires AmministratoreComunale
router.get('/stats', authenticate, authorize('AmministratoreComunale'), ctrl.getStats);
// RF30: export stats as CSV/PDF (?datasets=kpi,activities,poi_crowding,poi_inventory,supply_demand,citizen_needs)
router.get('/stats/export', authenticate, authorize('AmministratoreComunale'), ctrl.exportStats);
// Aggregated citizen service requests (scope ridotto: no userId, no personal data)
router.get('/service-requests', authenticate, authorize('AmministratoreComunale'), ctrl.getServiceRequestStats);

module.exports = router;
