const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { User, Consent } = require('../data/models');
const {
  sendPasswordReset, sendEmailVerification, sendWelcome,
  sendEntityRegistered, sendNewEntityRequest,
} = require('../notifications/email.service');
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

// Recovery codes: 8-char alphanumeric (avoiding ambiguous chars 0/O/1/I/L)
// formatted as XXXX-XXXX. SHA-256 is enough since the codes are random and
// single-use, no need for bcrypt's slowness.
const RECOVERY_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateRecoveryCode() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += RECOVERY_CODE_CHARSET[crypto.randomInt(RECOVERY_CODE_CHARSET.length)];
    if (i === 3) code += '-';
  }
  return code;
}
function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, generateRecoveryCode);
}
function hashRecoveryCode(input) {
  return crypto.createHash('sha256').update(String(input).replace(/[\s-]/g, '').toUpperCase()).digest('hex');
}
function looksLikeRecoveryCode(input) {
  if (typeof input !== 'string') return false;
  const cleaned = input.replace(/[\s-]/g, '');
  return cleaned.length === 8 && /^[A-Z0-9]+$/i.test(cleaned);
}

function validatePassword(password) {
  if (!password || password.length < 8) return 'La password deve avere almeno 8 caratteri';
  if (!/[A-Z]/.test(password)) return 'La password deve contenere almeno una lettera maiuscola';
  if (!/[a-z]/.test(password)) return 'La password deve contenere almeno una lettera minuscola';
  if (!/[0-9]/.test(password)) return 'La password deve contenere almeno un numero';
  if (!/[^A-Za-z0-9]/.test(password)) return 'La password deve contenere almeno un carattere speciale (!@#$%...)';
  return null;
}

function signToken(user, extraClaims = {}) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { id: user.id, ruolo: user.ruolo, jti, ...extraClaims },
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
  // Don't expose the hashed recovery codes themselves — just how many are left.
  if (Array.isArray(obj.twoFactorRecoveryCodes)) {
    obj.twoFactorRecoveryCodesRemaining = obj.twoFactorRecoveryCodes.length;
  }
  delete obj.twoFactorRecoveryCodes;
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

  const pwErr = validatePassword(password);
  if (pwErr) throw { status: 400, code: 'WEAK_PASSWORD', error: pwErr };

  // OCL C7: email must be unique
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw { status: 409, code: 'EMAIL_TAKEN', error: 'Email already registered' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  // OCL C3: registration creates the account (login requires email verification first)
  const user = await User.create({
    email, passwordHash, nome, cognome, dataNascita,
    emailVerified: false, emailVerificationToken,
  });

  // RNF19: persist the consents given at registration time
  const consentRows = ['privacy_policy', 'terms_of_service', 'marketing', 'analytics']
    .filter((type) => consents[type])
    .map((type) => ({ userId: user.id, type, version: '1.0', granted: true }));
  if (consentRows.length) await Consent.bulkCreate(consentRows);

  sendEmailVerification(email, nome, emailVerificationToken).catch(() => {});
  return { emailVerificationRequired: true };
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

  if (!user.emailVerified) {
    throw { status: 403, code: 'EMAIL_NOT_VERIFIED', error: 'Verifica la tua email prima di accedere. Controlla la tua casella di posta.' };
  }

  // RNF15 / OCL C1: 2FA mandatory for AmministratoreDiSistema.
  // First login of a brand-new admin: issue a token marked as setup-required;
  // middleware will only let it reach /auth/2fa/* until verify succeeds.
  if (user.ruolo === 'AmministratoreDiSistema') {
    if (!user.twoFactorEnabled) {
      const token = signToken(user, { needs2faSetup: true });
      return { user: sanitize(user), token, needs2faSetup: true };
    }
    if (!otpToken) {
      throw { status: 401, code: '2FA_REQUIRED', error: '2FA token required' };
    }

    // Accept either a 6-digit TOTP code or a single-use recovery code.
    // Recovery code path: consume only the used code; 2FA stays enabled with
    // the same secret. The user can keep using the authenticator app (if they
    // still have it) or explicitly reset 2FA from their profile.
    if (looksLikeRecoveryCode(otpToken)) {
      const candidateHash = hashRecoveryCode(otpToken);
      const stored = user.twoFactorRecoveryCodes || [];
      if (!stored.includes(candidateHash)) {
        throw { status: 401, code: '2FA_INVALID', error: 'Invalid 2FA token' };
      }
      const remaining = stored.filter((h) => h !== candidateHash);
      await user.update({ twoFactorRecoveryCodes: remaining });
      const token = signToken(user);
      return {
        user: sanitize(user),
        token,
        recoveryUsed: true,
        recoveryCodesRemaining: remaining.length,
      };
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
  await user.update({ twoFactorSecret: secret.base32, twoFactorEnabled: false });
  return { otpauthUrl: secret.otpauth_url, base32: secret.base32 };
}

async function verify2fa(userId, otpToken) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  if (!user.twoFactorSecret) throw { status: 400, code: '2FA_NOT_INITIALISED', error: 'Run /auth/2fa/setup first' };
  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: otpToken,
    window: 1,
  });
  if (!valid) throw { status: 400, code: '2FA_INVALID', error: 'Invalid OTP token' };

  // Generate 8 single-use recovery codes. Shown to the user once in plain text,
  // stored only as SHA-256 hashes.
  const recoveryCodes = generateRecoveryCodes(8);
  await user.update({
    twoFactorEnabled: true,
    twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
  });

  // Issue a fresh JWT without the needs2faSetup flag so the user is fully logged in.
  const token = signToken(user);
  return {
    message: '2FA enabled successfully',
    token,
    user: sanitize(user),
    recoveryCodes, // plain codes — must be saved by the user; never returned again
  };
}

async function regenerateRecoveryCodes(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  if (!user.twoFactorEnabled) {
    throw { status: 400, code: '2FA_NOT_ENABLED', error: '2FA must be enabled before generating recovery codes' };
  }
  const recoveryCodes = generateRecoveryCodes(8);
  await user.update({ twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode) });
  return { recoveryCodes };
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
  const pwErr = validatePassword(newPassword);
  if (pwErr) throw { status: 400, code: 'WEAK_PASSWORD', error: pwErr };

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

async function registerEntity({ email, password, nomeEnte }) {
  if (!email || !password || !nomeEnte) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'email, password e nomeEnte sono obbligatori' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw { status: 400, code: 'INVALID_EMAIL', error: 'Formato email non valido' };
  }
  const pwErr = validatePassword(password);
  if (pwErr) throw { status: 400, code: 'WEAK_PASSWORD', error: pwErr };

  const existingEmail = await User.findOne({ where: { email } });
  if (existingEmail) {
    throw { status: 409, code: 'EMAIL_TAKEN', error: 'Email già registrata' };
  }
  const existingEnte = await User.findOne({ where: { nomeEnte } });
  if (existingEnte) {
    throw { status: 409, code: 'NOME_ENTE_TAKEN', error: 'Nome ente già registrato' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email,
    passwordHash,
    nome: nomeEnte,
    cognome: '',
    dataNascita: '2000-01-01',
    ruolo: 'EnteCertificato',
    approvato: false,
    nomeEnte,
  });
  sendEntityRegistered(email, nomeEnte).catch(() => {});
  User.findAll({ where: { ruolo: 'AmministratoreDiSistema' }, attributes: ['email'] })
    .then((admins) => sendNewEntityRequest(admins.map((a) => a.email), nomeEnte, email))
    .catch(() => {});
  return { message: 'Richiesta di registrazione inviata. In attesa di approvazione da parte dell\'amministratore.', userId: user.id };
}
async function verifyEmail(token) {
  if (!token) throw { status: 400, code: 'MISSING_TOKEN', error: 'Token mancante' };
  const user = await User.findOne({ where: { emailVerificationToken: token } });
  if (!user) {
    throw { status: 400, code: 'TOKEN_INVALID', error: 'Link di verifica non valido o già utilizzato' };
  }
  await user.update({ emailVerified: true, emailVerificationToken: null });
  sendWelcome(user.email, user.nome).catch(() => {});
  const jwtToken = signToken(user);
  return { user: sanitize(user), token: jwtToken };
}

module.exports = {
  register, login, logout, getMe, updateProfile, updateLocation, deleteAccount,
  setup2fa, verify2fa, regenerateRecoveryCodes,
  forgotPassword, resetPassword, registerEntity, verifyEmail,
  listConsents, updateConsent,
};
