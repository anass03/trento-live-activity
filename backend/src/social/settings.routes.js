const router = require('express').Router();
const ctrl = require('./settings.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getSettings);
router.patch('/', authenticate, ctrl.patchAllSettings);

router.patch('/appearance', authenticate, ctrl.patchAppearance);
router.patch('/language-format', authenticate, ctrl.patchLanguageFormat);
router.patch('/notifications', authenticate, ctrl.patchNotifications);
router.patch('/privacy-location', authenticate, ctrl.patchPrivacyLocation);
router.patch('/preferences', authenticate, ctrl.patchPreferences);
router.patch('/accessibility', authenticate, ctrl.patchAccessibility);

module.exports = router;
