const router = require('express').Router();
const ctrl = require('./dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');

// OCL C25: caricaStatistiche requires AmministratoreComunale
router.get('/stats', authenticate, authorize('AmministratoreComunale'), ctrl.getStats);
// RF30: export stats as CSV
router.get('/stats/export', authenticate, authorize('AmministratoreComunale'), ctrl.exportStats);

module.exports = router;
