const router = require('express').Router();
const ctrl = require('./dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');

// OCL C25: caricaStatistiche requires AmministratoreComunale
router.get('/stats', authenticate, authorize('AmministratoreComunale'), ctrl.getStats);
// RF30: export stats as CSV/PDF (supports ?dataset=stats|poi_snapshot|service_requests)
router.get('/stats/export', authenticate, authorize('AmministratoreComunale'), ctrl.exportStats);
// Aggregated citizen service requests (scope ridotto: no userId, no personal data)
router.get('/service-requests', authenticate, authorize('AmministratoreComunale'), ctrl.getServiceRequestStats);

module.exports = router;
