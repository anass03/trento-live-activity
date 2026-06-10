const router = require('express').Router();
const ctrl = require('./cityAlerts.controller');

router.get('/trento', ctrl.listTrentoAlerts);
router.get('/:alertId', ctrl.getAlert);

module.exports = router;
