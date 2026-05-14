const router = require('express').Router();
const ctrl = require('./notifications.controller');
const { authenticate } = require('../middleware/auth');

// RF40: register the FCM device token after login
router.post('/device-token', authenticate, ctrl.registerDeviceToken);
router.delete('/device-token', authenticate, ctrl.unregisterDeviceToken);

// Send a test push to the current user — handy for verifying the setup.
router.post('/test', authenticate, ctrl.sendTestPush);

module.exports = router;
