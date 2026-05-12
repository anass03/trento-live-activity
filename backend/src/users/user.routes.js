const router = require('express').Router();
const ctrl = require('./user.controller');

// Temporary V1 identity bridge: returns a seeded/mock user until auth is wired into the frontend.
router.get('/me', ctrl.getMe);

module.exports = router;
