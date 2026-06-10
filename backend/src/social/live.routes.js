const router = require('express').Router();
const sse = require('./sse.manager');

router.get('/events-stream', sse.registerEventsClient);
router.get('/activities-stream', sse.registerActivitiesClient);

module.exports = router;
