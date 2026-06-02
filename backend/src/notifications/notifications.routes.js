const router = require('express').Router();
const ctrl = require('./notifications.controller');
const { authenticate, authorize } = require('../middleware/auth');

const ADMIN_SISTEMA = 'AmministratoreDiSistema';

// RF40: register the FCM device token after login
router.post('/device-token', authenticate, ctrl.registerDeviceToken);
router.delete('/device-token', authenticate, ctrl.unregisterDeviceToken);

// Send a test push to the current user — handy for verifying the setup.
router.post('/test', authenticate, ctrl.sendTestPush);

// Admin push management: reach stats + manual broadcast to an audience.
router.get('/admin/stats', authenticate, authorize(ADMIN_SISTEMA), ctrl.pushStats);
router.post('/admin/broadcast', authenticate, authorize(ADMIN_SISTEMA), ctrl.broadcast);

module.exports = router;
