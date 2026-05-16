const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('./auth.controller');
const { authenticate } = require('../middleware/auth');

// Rate limiter stretto per endpoint sensibili: brute-force su password, abuso
// di reset-password (account enumeration / spam mail), brute-force su OTP 2FA.
// Skippato in test per non far fallire le suite con 429.
const isTest = process.env.NODE_ENV === 'test';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi, riprova fra 15 minuti', code: 'RATE_LIMITED' },
});

// Public
router.post('/register', ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password/:token', authLimiter, ctrl.resetPassword);
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
// #M5: cambio password per utente già loggato (richiede currentPassword).
router.post('/me/password', authenticate, authLimiter, ctrl.changePassword);

// Profilo specifico per ruolo
router.patch('/me/ente', authenticate, ctrl.updateEnteProfile);
router.post('/me/onboarding', authenticate, ctrl.completeOnboarding);
router.get('/suggested-interests', authenticate, ctrl.suggestedInterests);

// 2FA (AmministratoreDiSistema)
router.post('/2fa/setup', authenticate, ctrl.setup2fa);
router.post('/2fa/verify', authenticate, authLimiter, ctrl.verify2fa);
router.post('/2fa/recovery-codes', authenticate, ctrl.regenerateRecoveryCodes);

// GDPR consent (RNF19)
router.get('/consents', authenticate, ctrl.listConsents);
router.post('/consents', authenticate, ctrl.updateConsent);

module.exports = router;
