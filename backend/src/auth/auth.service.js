const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const {
  User, Consent, CittadinoProfile, EnteProfile,
  AmministratoreSistemaProfile,
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
  // #H4: il token in chiaro va all'email, in DB salviamo solo SHA-256.
  // Un dump DB non rivela token utilizzabili. Scadenza 24h.
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenHash = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Scriviamo User + CittadinoProfile in transazione: o vanno entrambi, o nessuno.
  // I dati anagrafici restano anche su User per retrocompatibilità con il resto
  // del codebase (in attesa di migrare i call site al profilo).
  const user = await sequelize.transaction(async (t) => {
    const u = await User.create({
      email, passwordHash, nome, cognome, dataNascita,
      codiceFiscale: cfNorm,
      emailVerified: false,
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpires: verificationExpires,
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

  sendEmailVerification(email, nome, rawVerificationToken).catch(() => {});
  return { emailVerificationRequired: true };
}

async function listConsents(userId) {
  return Consent.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
}

async function updateConsent(userId, type, granted) {
  const validTypes = [
    'privacy_policy', 'terms_of_service', 'marketing', 'analytics',
    // Preferenze notifiche (RNF19 + RF40)
    'notif_email', 'notif_push',
  ];
  if (!validTypes.includes(type)) {
    throw { status: 400, code: 'INVALID_CONSENT_TYPE', error: `type must be one of ${validTypes.join(', ')}` };
  }
  // Disattivare push → revoca tutti i DeviceToken dell'utente
  if (type === 'notif_push' && !granted) {
    const { DeviceToken } = require('../data/models');
    await DeviceToken.destroy({ where: { userId } });
  }
  // RNF19: keep audit trail. Don't update old rows; insert a new one to record the change.
  // grantedAt è SEMPRE valorizzato (rappresenta il timestamp del record, non
  // "quando il consenso è attivo"). revokedAt solo se l'utente ha revocato.
  const now = new Date();
  return Consent.create({
    userId,
    type,
    version: '1.0',
    granted: !!granted,
    grantedAt: now,
    revokedAt: granted ? null : now,
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
      const rcProfile = await AmministratoreSistemaProfile.findOne({ where: { userId: user.id } });
      const token = signToken(user, { superAdmin: rcProfile?.superAdmin ?? false });
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

  // RNF-SA: embed superAdmin flag in JWT for AmministratoreDiSistema so
  // middleware can gate super-admin-only actions without an extra DB hit.
  let extraClaims = {};
  if (user.ruolo === 'AmministratoreDiSistema') {
    const sysProfile = await AmministratoreSistemaProfile.findOne({ where: { userId: user.id } });
    extraClaims = { superAdmin: sysProfile?.superAdmin ?? false };
  }

  const token = signToken(user, extraClaims);
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
  // #M5/M7: il frontend usa questo flag per decidere se mostrare il form
  // "cambio password" e quale conferma chiedere su deleteAccount.
  // sanitize() ha già rimosso passwordHash, quindi lo aggiungiamo qui dopo.
  base.hasPassword = !!user.passwordHash;
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

// Marca onboarding interessi come completato (cittadini).
async function completeOnboarding(userId, { interessi, dataNascita } = {}) {
  const { CittadinoProfile: _CittadinoProfile } = require('../data/models');
  const profile = await _CittadinoProfile.findOne({ where: { userId } });
  if (!profile) throw { status: 404, code: 'NOT_FOUND', error: 'Cittadino profile not found' };
  const nextInteressi = Array.isArray(interessi) ? interessi : profile.interessi;

  // Data di nascita: per gli utenti social non arriva piu' da Google, la
  // chiediamo qui. Se fornita, validiamo formato + eta' minima (GDPR / OCL C5).
  let nextDataNascita;
  if (dataNascita !== undefined && dataNascita !== null && dataNascita !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascita) || Number.isNaN(new Date(dataNascita).getTime())) {
      throw { status: 400, code: 'INVALID_BIRTHDATE', error: 'Data di nascita non valida' };
    }
    if (calcAge(dataNascita) < 13) {
      throw { status: 400, code: 'AGE_TOO_YOUNG', error: 'Devi avere almeno 13 anni (GDPR).' };
    }
    nextDataNascita = dataNascita;
  }

  const updates = {
    interessi: nextInteressi,
    onboardingComplete: true,
  };
  if (nextDataNascita) updates.dataNascita = nextDataNascita;
  await profile.update(updates);

  // Sync su User: interessi sempre, data di nascita se fornita.
  const user = await User.findByPk(userId);
  if (user) {
    const userUpdates = { interessi: nextInteressi };
    if (nextDataNascita) userUpdates.dataNascita = nextDataNascita;
    await user.update(userUpdates);
  }
  return profile;
}

async function updateLocation(userId, { lat, lng }) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw { status: 400, code: 'INVALID_LOCATION', error: 'lat and lng must be numbers' };
  }
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  await user.update({ lastLat: lat, lastLng: lng, lastLocationAt: new Date() });
  // Resolve address server-side and return it so the frontend can display it directly.
  const { reverseGeocode } = require('../lib/geocode');
  const address = await reverseGeocode(lat, lng).catch(() => null);
  return { lat, lng, updatedAt: new Date(), address };
}

async function deleteAccount(userId, { currentPassword, confirmEmail } = {}) {
  // GDPR art. 17 — right to erasure (RF26, RNF20).
  // #M7: prima richiede una re-conferma per evitare che un JWT rubato basti
  // a cancellare l'account vittima.
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  if (user.passwordHash) {
    // Utente con password: deve fornire la password attuale.
    if (!currentPassword) {
      throw { status: 400, code: 'PASSWORD_REQUIRED', error: 'La password attuale è obbligatoria per cancellare l\'account.' };
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw { status: 401, code: 'INVALID_CREDENTIALS', error: 'Password non corretta.' };
  } else {
    // Utente OAuth-only senza password: chiediamo conferma esplicita digitando
    // "DELETE <email>" (case-insensitive). Difensivo contro JWT replay.
    const expected = `DELETE ${user.email}`.toLowerCase().trim();
    if (!confirmEmail || String(confirmEmail).toLowerCase().trim() !== expected) {
      throw {
        status: 400,
        code: 'CONFIRMATION_REQUIRED',
        error: `Per cancellare un account social, digita "DELETE ${user.email}" per confermare.`,
      };
    }
  }

  await user.destroy();
}

// #M5: cambio password per utente già autenticato.
// Diverso dal flusso forgot/reset (che parte dall'email non autenticato):
// qui chiediamo la password attuale per il principio "qualcosa che conosci".
async function changePassword(userId, { currentPassword, newPassword } = {}) {
  if (!currentPassword || !newPassword) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'currentPassword e newPassword sono obbligatori.' };
  }
  const pwErr = validatePassword(newPassword);
  if (pwErr) throw { status: 400, code: 'WEAK_PASSWORD', error: pwErr };

  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };
  // Utenti OAuth-only non hanno una password attuale da verificare.
  if (!user.passwordHash) {
    throw {
      status: 400,
      code: 'NO_PASSWORD_SET',
      error: 'Questo account è registrato con un provider social. Non può avere una password locale.',
    };
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw { status: 401, code: 'INVALID_CREDENTIALS', error: 'Password attuale non corretta.' };

  if (currentPassword === newPassword) {
    throw { status: 400, code: 'PASSWORD_UNCHANGED', error: 'La nuova password deve essere diversa da quella attuale.' };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await user.update({
    passwordHash: newHash,
    // Invalida token reset pendenti per non riaprire il vecchio flusso
    passwordResetToken: null,
    passwordResetExpires: null,
  });
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
  // Anti-enumeration: ritorniamo sempre "ok" senza distinguere i casi sotto,
  // così un attaccante non scopre quali email esistono o di che tipo sono.
  if (!user) return;

  // Account OAuth-only (passwordHash null): non hanno una password da resettare.
  // L'utente DEVE accedere via Google/Apple. Silenzioso per anti-enumeration.
  if (!user.passwordHash) return;

  // SECURITY (#bug-2025-05-16): admin di sistema hanno 2FA obbligatoria (RNF15).
  // Il reset password normale bypasserebbe il 2FA → un attaccante con accesso
  // alla mail dell'admin potrebbe loggarsi senza fattore aggiuntivo. Blocco.
  // In futuro questi utenti useranno un flusso dedicato (recovery code 2FA).
  if (user.ruolo === 'AmministratoreDiSistema') return;

  // Admin comunali accedono via SPID (OCL C4), non con password.
  if (user.ruolo === 'AmministratoreComunale') return;

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

  // Defense in depth: stesso gating di forgotPassword, nel caso un token sia
  // stato emesso prima del fix o sia presente in DB per ragioni di seed/test.
  if (user.ruolo === 'AmministratoreDiSistema' || user.ruolo === 'AmministratoreComunale') {
    // Invalida il token e rifiuta. Niente leak di motivazione.
    await user.update({ passwordResetToken: null, passwordResetExpires: null });
    throw { status: 400, code: 'TOKEN_INVALID', error: 'Reset token is invalid or has expired' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await user.update({ passwordHash, passwordResetToken: null, passwordResetExpires: null });
}

async function logout(jti, expMs) {
  if (!jti) throw { status: 400, code: 'INVALID_TOKEN', error: 'Token has no jti claim' };
  // Persistiamo la revoca con la scadenza naturale del token. Il cleanup
  // job in tokenBlacklist purgerà la riga quando passa il TTL.
  await revoke(jti, expMs);
}

async function registerEntity({ password, nomeEnte, pec, email, consents }) {
  // L'ente si registra usando esclusivamente la PEC come contatto e identificativo
  // di login. Per retrocompatibilità il client può passare `email` ma vince `pec`.
  const pecRaw = pec || email;
  if (!password || !nomeEnte || !pecRaw) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'password, nomeEnte e pec sono obbligatori' };
  }
  // #M6: consenso GDPR esplicito anche per gli enti (parità con i cittadini).
  // Il rappresentante legale è comunque una persona fisica.
  if (!consents || !consents.privacy_policy || !consents.terms_of_service) {
    throw { status: 400, code: 'CONSENT_REQUIRED', error: 'Consent to privacy_policy and terms_of_service is required to register' };
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
  // #H4: hash del token in DB, plain solo nell'email, scadenza 24h.
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenHash = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpires: verificationExpires,
    }, { transaction: t });
    await EnteProfile.create({
      userId: u.id,
      nomeEnte,
      pec: pecNorm,
      approvato: false,
    }, { transaction: t });
    // #M6: salva audit trail dei consensi prestati dall'ente, come fatto per i cittadini.
    const consentRows = ['privacy_policy', 'terms_of_service', 'marketing', 'analytics']
      .filter((type) => consents[type])
      .map((type) => ({ userId: u.id, type, version: '1.0', granted: true }));
    if (consentRows.length) await Consent.bulkCreate(consentRows, { transaction: t });
    return u;
  });
  // Verifica della PEC: spediamo il token (in chiaro) alla PEC dichiarata.
  sendEmailVerification(pecNorm, nomeEnte, rawVerificationToken).catch(() => {});
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
  // #H4: il client passa il token in chiaro; in DB cerchiamo il SHA-256.
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ where: { emailVerificationToken: tokenHash } });
  if (!user) {
    throw { status: 400, code: 'TOKEN_INVALID', error: 'Link di verifica non valido o già utilizzato' };
  }
  // #H4: rifiuta se scaduto (oltre 24h dalla generazione).
  // Manteniamo retro-compatibilità con utenti pre-fix che non hanno expires.
  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    throw { status: 400, code: 'TOKEN_EXPIRED', error: 'Link di verifica scaduto. Richiedi un nuovo invio dalla pagina di login.' };
  }
  await user.update({
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
  });
  const jwtToken = signToken(user);
  return { user: sanitize(user), token: jwtToken };
}

module.exports = {
  register, login, logout, getMe, updateProfile, updateEnteProfile, completeOnboarding,
  changePassword,
  updateLocation, deleteAccount,
  setup2fa, verify2fa, regenerateRecoveryCodes,
  forgotPassword, resetPassword, registerEntity, verifyEmail,
  listConsents, updateConsent,
  signToken,
};
