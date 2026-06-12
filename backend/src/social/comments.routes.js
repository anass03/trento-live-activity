const router = require('express').Router();
const ctrl = require('./socialEvents.controller');
const { authenticate } = require('../middleware/auth');

router.patch('/:commentId', authenticate, ctrl.patchComment);
router.delete('/:commentId', authenticate, ctrl.removeComment);

module.exports = router;
