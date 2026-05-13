const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('../middleware/auth');

// Public
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);
router.post('/register/entity', ctrl.registerEntity);

// Protected
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.getMe);
router.put('/me', authenticate, ctrl.updateProfile);
router.put('/me/location', authenticate, ctrl.updateLocation);
router.delete('/me', authenticate, ctrl.deleteAccount);

// 2FA (AmministratoreDiSistema)
router.post('/2fa/setup', authenticate, ctrl.setup2fa);
router.post('/2fa/verify', authenticate, ctrl.verify2fa);
router.post('/2fa/recovery-codes', authenticate, ctrl.regenerateRecoveryCodes);

// GDPR consent (RNF19)
router.get('/consents', authenticate, ctrl.listConsents);
router.post('/consents', authenticate, ctrl.updateConsent);

module.exports = router;
