const router = require('express').Router();
const ctrl = require('./event.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Public
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);

// Certified entities only
router.post('/', authenticate, authorize('EnteCertificato'), ctrl.create);
router.put('/:id', authenticate, authorize('EnteCertificato'), ctrl.update);

module.exports = router;
