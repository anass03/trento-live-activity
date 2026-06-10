const router = require('express').Router();
const ctrl = require('./reviews.controller');
const { authenticate } = require('../middleware/auth');

router.patch('/:reviewId', authenticate, ctrl.update);
router.delete('/:reviewId', authenticate, ctrl.remove);
router.post('/:reviewId/report', authenticate, ctrl.report);

module.exports = router;
