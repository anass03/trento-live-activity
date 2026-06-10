const router = require('express').Router();
const ctrl = require('./socialUser.controller');
const { authenticate } = require('../middleware/auth');

router.post('/:participationId/confirm-attendance', authenticate, ctrl.confirm);
router.post('/:participationId/no-show', authenticate, ctrl.noShow);

module.exports = router;
