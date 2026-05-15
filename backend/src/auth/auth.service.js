const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const {
  User, Consent, CittadinoProfile, EnteProfile,
  sequelize,
} = require('../data/models');
const {
  sendPasswordReset, sendEmailVerification,
  sendEntityRegistered, sendNewEntityRequest,
} = require('../notifications/email.service');
const { revoke } = require('./tokenBlacklist');
const {
  isValidCodiceFiscale, normalizeCodiceFiscale,
  isValidPec, normalizePec,
} = require('./validators');

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

async function register({ email, password, nome, cognome, dataNascita, codiceFiscale, consents } = {}) {
  if (!email || !password || !nome || !cognome || !dataNascita || !codiceFiscale) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'email, password, nome, cognome, dataNascita e codiceFiscale sono obbligatori' };
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

  const cfNorm = normalizeCodiceFiscale(codiceFiscale);
  if (!isValidCodiceFiscale(cfNorm)) {
    throw { status: 400, code: 'INVALID_CF', error: 'Codice fiscale non valido' };
  }

  const pwErr = validatePassword(password);
  if (pwErr) throw { status: 400, code: 'WEAK_PASSWORD', error: pwErr };

  // OCL C7: email must be unique
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw { status: 409, code: 'EMAIL_TAKEN', error: 'Email already registered' };
  }

  const existingCfOnUser = await User.findOne({ where: { codiceFiscale: cfNorm } });
  const existingCfOnProfile = await CittadinoProfile.findOne({ where: { codiceFiscale: cfNorm } });
  if (existingCfOnUser || existingCfOnProfile) {
    throw { status: 409, code: 'CF_TAKEN', error: 'Codice fiscale già registrato' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  // Scriviamo User + CittadinoProfile in transazione: o vanno entrambi, o nessuno.
  // I dati anagrafici restano anche su User per retrocompatibilità con il resto
  // del codebase (in attesa di migrare i call site al profilo).
  const user = await sequelize.transaction(async (t) => {
    const u = await User.create({
      email, passwordHash, nome, cognome, dataNascita,
      codiceFiscale: cfNorm,
      emailVerified: false, emailVerificationToken,
    }, { transaction: t });
    await CittadinoProfile.create({
      userId: u.id,
      nome, cognome, dataNascita,
      codiceFiscale: cfNorm,
      interessi: [],
    }, { transaction: t });
    const consentRows = ['privacy_policy', 'terms_of_service', 'marketing', 'analytics']
      .filter((type) => consents[type])
      .map((type) => ({ userId: u.id, type, version: '1.0', granted: true }));
    if (consentRows.length) await Consent.bulkCreate(consentRows, { transaction: t });
    return u;
  });

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
  // Carica User + profilo specifico del ruolo per esporli al frontend.
  // Il profilo permette la vista role-aware nella ProfilePage.
  const {
    CittadinoProfile: _CittadinoProfile,
    EnteProfile: _EnteProfile,
    AmministratoreComunaleProfile: _ComunaleProfile,
    AmministratoreSistemaProfile: _SistemaProfile,
  } = require('../data/models');
  const user = await User.findByPk(userId, {
    include: [
      { model: _CittadinoProfile, as: 'cittadinoProfile' },
      { model: _EnteProfile, as: 'enteProfile' },
      { model: _ComunaleProfile, as: 'comunaleProfile' },
      { model: _SistemaProfile, as: 'sistemaProfile' },
    ],
  });
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  const base = sanitize(user);
  // Profilo del ruolo corrente — il client legge solo questo, non i 4 separati.
  let profile = null;
  if (user.ruolo === 'UtenteRegistrato' && user.cittadinoProfile) {
    profile = {
      kind: 'cittadino',
      nome: user.cittadinoProfile.nome,
      cognome: user.cittadinoProfile.cognome,
      dataNascita: user.cittadinoProfile.dataNascita,
      codiceFiscale: user.cittadinoProfile.codiceFiscale,
      interessi: user.cittadinoProfile.interessi || [],
      onboardingComplete: !!user.cittadinoProfile.onboardingComplete,
    };
  } else if (user.ruolo === 'EnteCertificato' && user.enteProfile) {
    profile = {
      kind: 'ente',
      nomeEnte: user.enteProfile.nomeEnte,
      pec: user.enteProfile.pec,
      approvato: user.enteProfile.approvato,
      noteAdmin: user.enteProfile.noteAdmin,
    };
  } else if (user.ruolo === 'AmministratoreComunale' && user.comunaleProfile) {
    profile = {
      kind: 'comunale',
      nome: user.comunaleProfile.nome,
      cognome: user.comunaleProfile.cognome,
      ufficio: user.comunaleProfile.ufficio,
      spidId: user.comunaleProfile.spidId,
    };
  } else if (user.ruolo === 'AmministratoreDiSistema' && user.sistemaProfile) {
    profile = {
      kind: 'sistema',
      nome: user.sistemaProfile.nome,
      cognome: user.sistemaProfile.cognome,
      superAdmin: user.sistemaProfile.superAdmin,
    };
  }

  return { ...base, profile };
}

async function updateProfile(userId, { nome, cognome, interessi }) {
  const { CittadinoProfile: _CittadinoProfile } = require('../data/models');
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  // Mantieni i campi legacy su User per retrocompatibilità con presenter/seed.
  await user.update({ nome, cognome, interessi });

  // Sincronizza il profilo cittadino se esiste (i nuovi cittadini ce l'hanno).
  if (user.ruolo === 'UtenteRegistrato') {
    const profile = await _CittadinoProfile.findOne({ where: { userId } });
    if (profile) {
      await profile.update({ nome, cognome, interessi });
    }
  }

  return sanitize(user);
}

// Aggiorna la descrizione/note di un ente certificato (campo modificabile dall'ente)
async function updateEnteProfile(userId, { noteAdmin }) {
  const { EnteProfile: _EnteProfile } = require('../data/models');
  const profile = await _EnteProfile.findOne({ where: { userId } });
  if (!profile) throw { status: 404, code: 'NOT_FOUND', error: 'Ente profile not found' };
  await profile.update({ noteAdmin: typeof noteAdmin === 'string' ? noteAdmin : profile.noteAdmin });
  return profile;
}

// Marca onboarding interessi come completato (cittadini)
async function completeOnboarding(userId, interessi) {
  const { CittadinoProfile: _CittadinoProfile } = require('../data/models');
  const profile = await _CittadinoProfile.findOne({ where: { userId } });
  if (!profile) throw { status: 404, code: 'NOT_FOUND', error: 'Cittadino profile not found' };
  await profile.update({
    interessi: Array.isArray(interessi) ? interessi : profile.interessi,
    onboardingComplete: true,
  });
  // Sync legacy su User
  const user = await User.findByPk(userId);
  if (user) await user.update({ interessi: profile.interessi });
  return profile;
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

async function registerEntity({ password, nomeEnte, pec, email }) {
  // L'ente si registra usando esclusivamente la PEC come contatto e identificativo
  // di login. Per retrocompatibilità il client può passare `email` ma vince `pec`.
  const pecRaw = pec || email;
  if (!password || !nomeEnte || !pecRaw) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'password, nomeEnte e pec sono obbligatori' };
  }
  const pecNorm = normalizePec(pecRaw);
  if (!isValidPec(pecNorm)) {
    throw { status: 400, code: 'INVALID_PEC', error: 'Indirizzo PEC non valido: deve essere un\'email su un dominio di posta certificata' };
  }
  const pwErr = validatePassword(password);
  if (pwErr) throw { status: 400, code: 'WEAK_PASSWORD', error: pwErr };

  // La PEC viene usata anche come email di login → controllo unicità su entrambi i campi.
  const existingEmail = await User.findOne({ where: { email: pecNorm } });
  if (existingEmail) {
    throw { status: 409, code: 'EMAIL_TAKEN', error: 'PEC già registrata' };
  }
  const existingPec = await User.findOne({ where: { pec: pecNorm } });
  if (existingPec) {
    throw { status: 409, code: 'PEC_TAKEN', error: 'PEC già registrata' };
  }
  const existingEnteOnUser = await User.findOne({ where: { nomeEnte } });
  const existingEnteOnProfile = await EnteProfile.findOne({ where: { nomeEnte } });
  if (existingEnteOnUser || existingEnteOnProfile) {
    throw { status: 409, code: 'NOME_ENTE_TAKEN', error: 'Nome ente già registrato' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  // User + EnteProfile in transazione
  const user = await sequelize.transaction(async (t) => {
    const u = await User.create({
      email: pecNorm,
      passwordHash,
      nome: nomeEnte,
      cognome: '',
      dataNascita: '2000-01-01',
      ruolo: 'EnteCertificato',
      approvato: false,
      nomeEnte,
      pec: pecNorm,
      emailVerified: false,
      emailVerificationToken,
    }, { transaction: t });
    await EnteProfile.create({
      userId: u.id,
      nomeEnte,
      pec: pecNorm,
      approvato: false,
    }, { transaction: t });
    return u;
  });
  // Verifica della PEC: spediamo il token alla PEC dichiarata.
  sendEmailVerification(pecNorm, nomeEnte, emailVerificationToken).catch(() => {});
  sendEntityRegistered(pecNorm, nomeEnte).catch(() => {});
  User.findAll({ where: { ruolo: 'AmministratoreDiSistema' }, attributes: ['email'] })
    .then((admins) => sendNewEntityRequest(admins.map((a) => a.email), nomeEnte, pecNorm))
    .catch(() => {});
  return {
    message: 'Registrazione ricevuta. Controlla la PEC indicata per confermare l\'indirizzo. Dopo la verifica, un amministratore approverà l\'ente.',
    userId: user.id,
    pecVerificationRequired: true,
  };
}
async function verifyEmail(token) {
  if (!token) throw { status: 400, code: 'MISSING_TOKEN', error: 'Token mancante' };
  const user = await User.findOne({ where: { emailVerificationToken: token } });
  if (!user) {
    throw { status: 400, code: 'TOKEN_INVALID', error: 'Link di verifica non valido o già utilizzato' };
  }
  await user.update({ emailVerified: true, emailVerificationToken: null });
  const jwtToken = signToken(user);
  return { user: sanitize(user), token: jwtToken };
}

module.exports = {
  register, login, logout, getMe, updateProfile, updateEnteProfile, completeOnboarding,
  updateLocation, deleteAccount,
  setup2fa, verify2fa, regenerateRecoveryCodes,
  forgotPassword, resetPassword, registerEntity, verifyEmail,
  listConsents, updateConsent,
};
