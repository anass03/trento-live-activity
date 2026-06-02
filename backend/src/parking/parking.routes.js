const router = require('express').Router();
const ctrl = require('./parking.controller');

// Public — RF affollamento parcheggi. Backend proxy to the Comune di Trento
// registry to sidestep CORS and add caching/normalisation.
router.get('/', ctrl.getParking);

module.exports = router;
