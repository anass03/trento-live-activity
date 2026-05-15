const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('../middleware/auth');

// Public
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);
router.post('/register/entity', ctrl.registerEntity);
router.get('/verify-email', ctrl.verifyEmail);

// Social OAuth (RF8 / E1, E2)
router.post('/oauth/google', ctrl.oauthGoogle);
router.post('/oauth/apple', ctrl.oauthApple);
router.post('/spid/callback', ctrl.spidCallback);

// Protected
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.getMe);
router.put('/me', authenticate, ctrl.updateProfile);
router.put('/me/location', authenticate, ctrl.updateLocation);
router.delete('/me', authenticate, ctrl.deleteAccount);

// Profilo specifico per ruolo
router.patch('/me/ente', authenticate, ctrl.updateEnteProfile);
router.post('/me/onboarding', authenticate, ctrl.completeOnboarding);
router.get('/suggested-interests', authenticate, ctrl.suggestedInterests);

// 2FA (AmministratoreDiSistema)
router.post('/2fa/setup', authenticate, ctrl.setup2fa);
router.post('/2fa/verify', authenticate, ctrl.verify2fa);
router.post('/2fa/recovery-codes', authenticate, ctrl.regenerateRecoveryCodes);

// GDPR consent (RNF19)
router.get('/consents', authenticate, ctrl.listConsents);
router.post('/consents', authenticate, ctrl.updateConsent);

module.exports = router;
