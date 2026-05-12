const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { User, Consent } = require('../data/models');
const { sendPasswordReset } = require('../notifications/email.service');
const { revoke } = require('./tokenBlacklist');

function calcAge(dataNascita) {
  const today = new Date();
  const birth = new Date(dataNascita);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

function signToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { id: user.id, ruolo: user.ruolo, jti },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return token;
}

function sanitize(user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  delete obj.passwordHash;
  delete obj.twoFactorSecret;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
}

async function register({ email, password, nome, cognome, dataNascita, consents } = {}) {
  if (!email || !password || !nome || !cognome || !dataNascita) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'email, password, nome, cognome and dataNascita are required' };
  }

  // RNF19 — GDPR art. 7: explicit consent required for privacy_policy + terms_of_service
  if (!consents || !consents.privacy_policy || !consents.terms_of_service) {
    throw { status: 400, code: 'CONSENT_REQUIRED', error: 'Consent to privacy_policy and terms_of_service is required to register' };
  }

  // OCL C5: age >= 13
  if (calcAge(dataNascita) < 13) {
    throw { status: 400, code: 'AGE_TOO_YOUNG', error: 'Must be at least 13 years old to register' };
  }

  // OCL C2: validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw { status: 400, code: 'INVALID_EMAIL', error: 'Invalid email format' };
  }

  if (!password || password.length < 8) {
    throw { status: 400, code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters' };
  }

  // OCL C7: email must be unique
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw { status: 409, code: 'EMAIL_TAKEN', error: 'Email already registered' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // OCL C3: registration automatically authenticates the user
  const user = await User.create({ email, passwordHash, nome, cognome, dataNascita });

  // RNF19: persist the consents given at registration time
  const consentRows = ['privacy_policy', 'terms_of_service', 'marketing', 'analytics']
    .filter((type) => consents[type])
    .map((type) => ({ userId: user.id, type, version: '1.0', granted: true }));
  if (consentRows.length) await Consent.bulkCreate(consentRows);

  const token = signToken(user);
  return { user: sanitize(user), token };
}

async function listConsents(userId) {
  return Consent.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
}

async function updateConsent(userId, type, granted) {
  const validTypes = ['privacy_policy', 'terms_of_service', 'marketing', 'analytics'];
  if (!validTypes.includes(type)) {
    throw { status: 400, code: 'INVALID_CONSENT_TYPE', error: `type must be one of ${validTypes.join(', ')}` };
  }
  // RNF19: keep audit trail. Don't update old rows; insert a new one to record the change.
  return Consent.create({
    userId,
    type,
    version: '1.0',
    granted: !!granted,
    grantedAt: granted ? new Date() : null,
    revokedAt: granted ? null : new Date(),
  });
}

async function login({ email, password, otpToken } = {}) {
  if (!email || !password) {
    throw { status: 400, code: 'MISSING_CREDENTIALS', error: 'Email and password are required' };
  }

  const user = await User.findOne({ where: { email } });
  if (!user || !user.passwordHash) {
    throw { status: 401, code: 'INVALID_CREDENTIALS', error: 'Invalid email or password' };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw { status: 401, code: 'INVALID_CREDENTIALS', error: 'Invalid email or password' };
  }

  // RNF15 / OCL C1: 2FA mandatory for AmministratoreDiSistema
  if (user.ruolo === 'AmministratoreDiSistema') {
    if (!user.twoFactorEnabled) {
      throw { status: 403, code: '2FA_REQUIRED', error: '2FA is required for system administrators' };
    }
    if (!otpToken) {
      throw { status: 401, code: '2FA_REQUIRED', error: '2FA token required' };
    }
    const valid2fa = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: otpToken,
      window: 1,
    });
    if (!valid2fa) {
      throw { status: 401, code: '2FA_INVALID', error: 'Invalid 2FA token' };
    }
  }

  const token = signToken(user);
  return { user: sanitize(user), token };
}

async function getMe(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  return sanitize(user);
}

async function updateProfile(userId, { nome, cognome, interessi }) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  await user.update({ nome, cognome, interessi });
  return sanitize(user);
}

async function updateLocation(userId, { lat, lng }) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw { status: 400, code: 'INVALID_LOCATION', error: 'lat and lng must be numbers' };
  }
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  await user.update({ lastLat: lat, lastLng: lng, lastLocationAt: new Date() });
  return { lat, lng, updatedAt: new Date() };
}

async function deleteAccount(userId) {
  // GDPR art. 17 — right to erasure (RF26, RNF20)
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  await user.destroy();
}

async function setup2fa(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  if (user.ruolo !== 'AmministratoreDiSistema') {
    throw { status: 403, code: 'FORBIDDEN', error: '2FA setup is only for system administrators' };
  }
  const secret = speakeasy.generateSecret({ name: `TrentoLiveActivity:${user.email}` });
  await user.update({ twoFactorSecret: secret.base32 });
  return { otpauthUrl: secret.otpauth_url };
}

async function verify2fa(userId, token) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 1,
  });
  if (!valid) throw { status: 400, code: '2FA_INVALID', error: 'Invalid OTP token' };
  await user.update({ twoFactorEnabled: true });
  return { message: '2FA enabled successfully' };
}

async function forgotPassword(email) {
  const user = await User.findOne({ where: { email } });
  // Always return success to avoid user enumeration attacks
  if (!user || !user.passwordHash) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await user.update({ passwordResetToken: tokenHash, passwordResetExpires: expires });
  await sendPasswordReset(email, rawToken);
}

async function resetPassword(rawToken, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw { status: 400, code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters' };
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({ where: { passwordResetToken: tokenHash } });

  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw { status: 400, code: 'TOKEN_INVALID', error: 'Reset token is invalid or has expired' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await user.update({ passwordHash, passwordResetToken: null, passwordResetExpires: null });
}

function logout(jti) {
  if (!jti) throw { status: 400, code: 'INVALID_TOKEN', error: 'Token has no jti claim' };
  revoke(jti);
}

async function registerEntity({ email, password, nomeEnte, nome, cognome }) {
  if (!email || !password || !nomeEnte) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'email, password and nomeEnte are required' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw { status: 400, code: 'INVALID_EMAIL', error: 'Invalid email format' };
  }
  if (password.length < 8) {
    throw { status: 400, code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters' };
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw { status: 409, code: 'EMAIL_TAKEN', error: 'Email already registered' };
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email,
    passwordHash,
    nome: nome || nomeEnte,
    cognome: cognome || '',
    dataNascita: '2000-01-01', // placeholder — not meaningful for entities
    ruolo: 'EnteCertificato',
    approvato: false,
    nomeEnte,
  });
  return { message: 'Registration request submitted. Await admin approval.', userId: user.id };
}
module.exports = {
  register, login, logout, getMe, updateProfile, updateLocation, deleteAccount,
  setup2fa, verify2fa, forgotPassword, resetPassword, registerEntity,
  listConsents, updateConsent,
};
