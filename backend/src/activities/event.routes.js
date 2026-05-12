const router = require('express').Router();
const ctrl = require('./event.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Public — RF15 search via ?q, filter via ?categoria
router.get('/', ctrl.list);

// Certified entity manages their own events (must come before /:id)
router.get('/mine', authenticate, authorize('EnteCertificato'), ctrl.listMine);

// Public detail (also increments view counter — RF25)
router.get('/:id', ctrl.get);

// RF12 / RF49: calendar export
router.get('/:id/calendar', ctrl.calendar);

// RF25: certified entities view stats for their own events
router.get('/:id/stats', authenticate, authorize('EnteCertificato'), ctrl.stats);

// Certified entities only
router.post('/', authenticate, authorize('EnteCertificato'), ctrl.create);
router.put('/:id', authenticate, authorize('EnteCertificato'), ctrl.update);

module.exports = router;
