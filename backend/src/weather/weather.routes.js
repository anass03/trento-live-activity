const router = require('express').Router();
const ctrl = require('./weather.controller');

router.get('/trento', ctrl.getTrentoWeather);

module.exports = router;
