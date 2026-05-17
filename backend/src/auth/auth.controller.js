const service = require('./auth.service');
const oauth = require('./oauth.service');

async function register(req, res, next) {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    const result = await service.login(req.body);
    res.json(result);
  } catch (e) { next(e); }
}

async function getMe(req, res, next) {
  try {
    const user = await service.getMe(req.user.id);
    res.json(user);
  } catch (e) { next(e); }
}

async function updateProfile(req, res, next) {
  try {
    const user = await service.updateProfile(req.user.id, req.body);
    res.json(user);
  } catch (e) { next(e); }
}

async function updateLocation(req, res, next) {
  try {
    const result = await service.updateLocation(req.user.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
}

async function deleteAccount(req, res, next) {
  try {
    const { currentPassword, confirmEmail } = req.body || {};
    await service.deleteAccount(req.user.id, { currentPassword, confirmEmail });
    // Revoca anche il JWT corrente, l'account non esiste più: il token non
    // deve essere riutilizzabile fino alla naturale scadenza.
    const expMs = req.user.exp ? req.user.exp * 1000 : undefined;
    await service.logout(req.user.jti, expMs).catch(() => {});
    res.status(204).send();
  } catch (e) { next(e); }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    await service.changePassword(req.user.id, { currentPassword, newPassword });
    // Forza re-login revocando il JWT attuale.
    const expMs = req.user.exp ? req.user.exp * 1000 : undefined;
    await service.logout(req.user.jti, expMs).catch(() => {});
    res.status(204).send();
  } catch (e) { next(e); }
}

async function setup2fa(req, res, next) {
  try {
    const result = await service.setup2fa(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
}

async function verify2fa(req, res, next) {
  try {
    const result = await service.verify2fa(req.user.id, req.body.token);
    res.json(result);
  } catch (e) { next(e); }
}

async function regenerateRecoveryCodes(req, res, next) {
  try {
    const result = await service.regenerateRecoveryCodes(req.user.id);
    res.json(result);
  } catch (e) { next(e); }
}

async function forgotPassword(req, res, next) {
  try {
    await service.forgotPassword(req.body.email);
    res.json({ message: 'If that email is registered, a reset link has been sent' });
  } catch (e) { next(e); }
}

async function resetPassword(req, res, next) {
  try {
    await service.resetPassword(req.params.token, req.body.password);
    res.json({ message: 'Password updated successfully' });
  } catch (e) { next(e); }
}

async function logout(req, res, next) {
  try {
    // req.user.exp è in secondi (standard JWT) → convertito in ms per il TTL DB.
    const expMs = req.user.exp ? req.user.exp * 1000 : undefined;
    await service.logout(req.user.jti, expMs);
    res.status(204).send();
  } catch (e) { next(e); }
}

async function registerEntity(req, res, next) {
  try {
    const result = await service.registerEntity(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function verifyEmail(req, res, next) {
  try {
    const result = await service.verifyEmail(req.query.token);
    res.json(result);
  } catch (e) { next(e); }
}

async function listConsents(req, res, next) {
  try {
    const consents = await service.listConsents(req.user.id);
    res.json(consents);
  } catch (e) { next(e); }
}

async function updateConsent(req, res, next) {
  try {
    const consent = await service.updateConsent(req.user.id, req.body.type, req.body.granted);
    res.json(consent);
  } catch (e) { next(e); }
}

async function updateEnteProfile(req, res, next) {
  try {
    const profile = await service.updateEnteProfile(req.user.id, req.body);
    res.json(profile);
  } catch (e) { next(e); }
}

async function completeOnboarding(req, res, next) {
  try {
    const { interessi } = req.body || {};
    const profile = await service.completeOnboarding(req.user.id, { interessi });
    res.json(profile);
  } catch (e) { next(e); }
}

// Suggerimento dinamico: data una lista di interessi già scelti, calcola le
// categorie co-occorrenti più frequenti fra gli altri cittadini.
// Niente ML — query SQL aggregata sulla colonna interessi (ARRAY).
async function suggestedInterests(req, res, next) {
  try {
    const { sequelize } = require('../data/models');
    const picked = String(req.query.picked || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (picked.length === 0) {
      return res.json({ suggestions: [] });
    }
    const rows = await sequelize.query(
      `SELECT i AS interesse, COUNT(*)::int AS count
       FROM "cittadino_profiles", UNNEST("interessi") AS i
       WHERE "interessi" && ARRAY[:picked]::varchar[]
         AND NOT (i = ANY(ARRAY[:picked]::varchar[]))
       GROUP BY i
       ORDER BY count DESC
       LIMIT 3`,
      { replacements: { picked }, type: sequelize.QueryTypes.SELECT },
    );
    res.json({ suggestions: rows.map((r) => r.interesse) });
  } catch (e) { next(e); }
}

const sanitizeForResponse = (u) => ({
  id: u.id, email: u.email, ruolo: u.ruolo, emailVerified: u.emailVerified,
});

async function oauthGoogle(req, res, next) {
  try {
    // Il frontend ora usa il flusso "implicit" e ci passa un access_token
    // (non più un id_token), così possiamo chiamare la People API per la
    // data di nascita. Manteniamo `idToken` come alias retro-compatibile.
    const { accessToken, idToken } = req.body || {};
    const token = accessToken || idToken;
    if (!token) return res.status(400).json({ error: 'accessToken required', code: 'MISSING_TOKEN' });
    const result = await oauth.loginWithGoogle(token);
    res.json({ user: sanitizeForResponse(result.user), token: result.token });
  } catch (e) { next(e); }
}

async function oauthApple(req, res, next) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: 'idToken required', code: 'MISSING_TOKEN' });
    const { user, token } = await oauth.loginWithApple(idToken);
    res.json({ user: sanitizeForResponse(user), token });
  } catch (e) { next(e); }
}

async function spidCallback(req, res, next) {
  try {
    const { user, token } = await oauth.loginWithSpidStub(req.body || {});
    res.json({ user: sanitizeForResponse(user), token });
  } catch (e) { next(e); }
}

module.exports = {
  register, login, logout, getMe, updateProfile, updateLocation, deleteAccount,
  changePassword,
  setup2fa, verify2fa, regenerateRecoveryCodes,
  forgotPassword, resetPassword, registerEntity, verifyEmail,
  listConsents, updateConsent,
  updateEnteProfile, completeOnboarding, suggestedInterests,
  oauthGoogle, oauthApple, spidCallback,
};
