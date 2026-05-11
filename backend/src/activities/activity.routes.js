const router = require('express').Router();
const ctrl = require('./activity.controller');
const { authenticate, authorize } = require('../middleware/auth');

const REGISTERED = 'UtenteRegistrato';

// Public
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);

// Registered users only
router.post('/', authenticate, authorize(REGISTERED, 'EnteCertificato'), ctrl.create);
router.put('/:id', authenticate, authorize(REGISTERED, 'EnteCertificato'), ctrl.update);
router.delete('/:id', authenticate, authorize(REGISTERED, 'EnteCertificato'), ctrl.cancel);
router.post('/:id/join', authenticate, authorize(REGISTERED), ctrl.join);
router.delete('/:id/join', authenticate, authorize(REGISTERED), ctrl.leave);

module.exports = router;
