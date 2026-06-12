const router = require('express').Router();
const ctrl = require('./activity.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const REGISTERED = 'UtenteRegistrato';

// Public — RF15 search via ?q, RF14 filter via ?tipo, RF9 personalised via ?mine=interests (auth)
router.get('/', optionalAuth, ctrl.list);
router.get('/:id', ctrl.get);

// RF12 / RF49: calendar export (public — the link can be shared)
router.get('/:id/calendar', ctrl.calendar);

// Registered users only — gli Enti Certificati pubblicano esclusivamente
// eventi (event.routes): le attività spontanee restano dei cittadini.
router.post('/', authenticate, authorize(REGISTERED), ctrl.create);
router.put('/:id', authenticate, authorize(REGISTERED), ctrl.update);
router.delete('/:id', authenticate, authorize(REGISTERED), ctrl.cancel);
router.post('/:id/join', authenticate, authorize(REGISTERED), ctrl.join);
router.delete('/:id/join', authenticate, authorize(REGISTERED), ctrl.leave);

module.exports = router;
