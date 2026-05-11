const router = require('express').Router();
const ctrl = require('./map.controller');
const { authenticate, authorize } = require('../middleware/auth');

const ADMIN_SISTEMA = 'AmministratoreDiSistema';

// Public — RF2, RF3, RF38, RF39
router.get('/', ctrl.getMap);
router.get('/poi', ctrl.listPOIs);
router.get('/poi/:id', ctrl.getPOI);

// System administrator only — RF36
router.post('/poi', authenticate, authorize(ADMIN_SISTEMA), ctrl.createPOI);
router.put('/poi/:id', authenticate, authorize(ADMIN_SISTEMA), ctrl.updatePOI);
router.delete('/poi/:id', authenticate, authorize(ADMIN_SISTEMA), ctrl.deletePOI);

module.exports = router;
