// OAuth providers: Google + Apple (verifica idToken, crea/recupera utente,
// rilascia JWT TLA). Niente passport: usiamo direttamente i verifier ufficiali.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { OAuth2Client } = require('google-auth-library');
const { User, CittadinoProfile, sequelize } = require('../data/models');
const { signToken } = require('./auth.service');

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const appleJwks = jwksClient({ jwksUri: APPLE_JWKS_URL, cache: true, cacheMaxAge: 86400000 });

function getAppleKey(header, cb) {
  appleJwks.getSigningKey(header.kid, (err, key) => {
    if (err) return cb(err);
    cb(null, key.getPublicKey());
  });
}

function verifyAppleIdToken(idToken, audience) {
  return new Promise((resolve, reject) => {
    jwt.verify(idToken, getAppleKey, {
      audience,
      issuer: 'https://appleid.apple.com',
      algorithms: ['RS256'],
    }, (err, payload) => {
      if (err) return reject(err);
      resolve(payload);
    });
  });
}

// Calcola età da una data YYYY-MM-DD. Usato per il check anti-minori (GDPR / OCL C5).
function ageFromIso(dateIso) {
  const birth = new Date(dateIso);
  if (Number.isNaN(birth.getTime())) return NaN;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

// Sceglie la data di nascita per un nuovo utente social.
// - Se Google ci dà una data completa (Y+M+D) e l'utente ha >= 13 anni → la usa.
// - Se è minore di 13 → eccezione (GDPR art. 8 / OCL C5).
// - Se manca o è incompleta (es. Google restituisce solo M+D senza anno) → placeholder.
const BIRTHDATE_PLACEHOLDER = '2000-01-01';
function resolveSocialBirthdate(provided) {
  if (!provided || !/^\d{4}-\d{2}-\d{2}$/.test(provided)) return BIRTHDATE_PLACEHOLDER;
  const age = ageFromIso(provided);
  if (Number.isNaN(age)) return BIRTHDATE_PLACEHOLDER;
  if (age < 13) {
    throw {
      status: 403,
      code: 'UNDERAGE',
      error: 'Devi avere almeno 13 anni per registrarti (GDPR).',
    };
  }
  return provided;
}

// Crea-o-recupera il cittadino. Per gli account social non c'è una password
// vera (passwordHash è un random hash) e la mail è considerata verificata
// (il provider l'ha già verificata).
//
// SECURITY (#bug-2025-05-15): Se l'email appartiene già a un account con ruolo
// privilegiato (admin di sistema, comune, ente), il login social DEVE essere
// rifiutato — altrimenti bypassiamo 2FA / SPID / verifica PEC e si entra
// senza i controlli previsti per quel ruolo. OAuth Google/Apple è esclusivo
// dei cittadini (UtenteRegistrato).
async function ensureCitizenFromSocial({ email, nome, cognome, providerId, provider, dataNascita }) {
  if (!email) throw { status: 400, code: 'OAUTH_NO_EMAIL', error: `Il provider ${provider} non ha fornito un'email` };

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    // Hardening: blocca OAuth per account non-cittadino.
    if (existing.ruolo === 'AmministratoreDiSistema') {
      throw {
        status: 403,
        code: 'OAUTH_FORBIDDEN_ADMIN',
        error: 'Questo account è di un amministratore di sistema: accedi con email e password (2FA obbligatoria). L\'accesso social non è ammesso per ragioni di sicurezza.',
      };
    }
    if (existing.ruolo === 'AmministratoreComunale') {
      throw {
        status: 403,
        code: 'OAUTH_FORBIDDEN_MUNICIPAL',
        error: 'Questo account appartiene al Comune: accedi tramite SPID, non con Google/Apple.',
      };
    }
    if (existing.ruolo === 'EnteCertificato') {
      throw {
        status: 403,
        code: 'OAUTH_FORBIDDEN_ENTITY',
        error: 'Questo account è di un ente certificato: accedi con email PEC e password.',
      };
    }
    // Cittadino esistente: ok, marca emailVerified e procedi.
    if (!existing.emailVerified) {
      await existing.update({ emailVerified: true, emailVerificationToken: null });
    }
    // Backfill della data di nascita: se l'account era stato creato col placeholder
    // (es. prima dello scope birthday, o senza People API abilitata) e ora Google
    // ci dà una data reale → aggiorniamo. Se l'utente l'aveva già cambiata a mano
    // nel profilo, NON la tocchiamo (rispettiamo l'input manuale).
    if (dataNascita) {
      try {
        const resolved = resolveSocialBirthdate(dataNascita);
        const isPlaceholderOnUser = String(existing.dataNascita).startsWith(BIRTHDATE_PLACEHOLDER);
        const profile = await CittadinoProfile.findOne({ where: { userId: existing.id } });
        const isPlaceholderOnProfile = profile && String(profile.dataNascita).startsWith(BIRTHDATE_PLACEHOLDER);
        if (isPlaceholderOnUser) await existing.update({ dataNascita: resolved });
        if (profile && isPlaceholderOnProfile) await profile.update({ dataNascita: resolved });
      } catch (e) {
        // Se è UNDERAGE blocchiamo. Altri errori: best-effort, non rompiamo il login.
        if (e && e.code === 'UNDERAGE') throw e;
      }
    }
    return existing;
  }

  // Nuovo utente social — passwordHash=null (NO random hash!).
  // Motivazione (security): se mettessimo un random hash, `forgotPassword`
  // permetterebbe a chiunque possieda la mail di impostare una password e
  // bypassare il flusso OAuth (bug-2025-05-16). Con null, login con password
  // e reset password sono bloccati lato server. L'utente DEVE usare OAuth.
  // Niente CF reale (lo aggiungerà dal profilo). Onboarding interessi resta
  // da fare. dataNascita arriva da People API quando l'utente ha condiviso
  // lo scope; se manca usiamo un placeholder che l'utente aggiornerà.
  const birthdate = resolveSocialBirthdate(dataNascita);

  const user = await sequelize.transaction(async (t) => {
    const u = await User.create({
      email,
      passwordHash: null,
      nome: nome || email.split('@')[0],
      cognome: cognome || '',
      dataNascita: birthdate,
      ruolo: 'UtenteRegistrato',
      emailVerified: true,
    }, { transaction: t });
    await CittadinoProfile.create({
      userId: u.id,
      nome: nome || email.split('@')[0],
      cognome: cognome || '',
      dataNascita: birthdate,
      // CF placeholder vuoto: lo riempirà dal profilo. Lasciamo unique sull'attuale
      // colonna che è NOT NULL: usiamo un sentinel basato sul providerId per
      // non collidere fra utenti diversi. Il client dovrà chiedere il CF reale.
      codiceFiscale: `${provider.toUpperCase()}-${providerId.slice(0, 11).toUpperCase()}`.slice(0, 16),
      interessi: [],
      onboardingComplete: false,
    }, { transaction: t });
    return u;
  });
  return user;
}

// Recupera la data di nascita dell'utente Google via People API.
// Richiede:
//   - scope: https://www.googleapis.com/auth/user.birthday.read
//   - People API abilitata sul progetto Google Cloud
// Ritorna stringa YYYY-MM-DD o null se non disponibile (data parziale, non
// condivisa, o errore di rete: in tutti i casi best-effort).
async function fetchGoogleBirthday(accessToken) {
  try {
    const resp = await fetch(
      'https://people.googleapis.com/v1/people/me?personFields=birthdays',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      console.warn(`[oauth.google] People API HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
      return null;
    }
    const data = await resp.json();
    const birthdays = Array.isArray(data.birthdays) ? data.birthdays : [];
    if (birthdays.length === 0) {
      console.log('[oauth.google] People API: nessuna birthday nel profilo utente');
      return null;
    }
    // Preferisci l'entry primaria (Google la marca con metadata.primary).
    const primary = birthdays.find((b) => b.metadata && b.metadata.primary) || birthdays[0];
    const date = primary && primary.date;
    // L'utente può avere solo giorno/mese senza anno: in quel caso non è usabile.
    if (!date || !date.year || !date.month || !date.day) {
      console.log('[oauth.google] People API: birthday senza anno (parziale, non usabile)', date);
      return null;
    }
    const y = String(date.year).padStart(4, '0');
    const m = String(date.month).padStart(2, '0');
    const d = String(date.day).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    console.log(`[oauth.google] People API: birthday recuperata ${iso}`);
    return iso;
  } catch (e) {
    console.warn('[oauth.google] People API fetch failed:', e.message);
    return null;
  }
}

// Login con Google via access_token (flusso "implicit" lato frontend).
// Vantaggio rispetto al solo idToken: con l'access_token possiamo chiamare la
// People API per recuperare la data di nascita reale dell'utente, invece di
// usare il placeholder 2000-01-01.
async function loginWithGoogle(accessToken) {
  if (!accessToken) {
    throw { status: 400, code: 'OAUTH_NO_TOKEN', error: 'access_token mancante' };
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw { status: 503, code: 'OAUTH_NOT_CONFIGURED', error: 'GOOGLE_CLIENT_ID non configurato' };
  }

  // SECURITY: verifica che l'access_token sia stato emesso per il NOSTRO
  // client id (claim `aud` esposto da tokeninfo). Senza questo check un
  // access_token ottenuto da una QUALSIASI app Google di terze parti
  // permetterebbe di loggarsi qui come il suo proprietario (token substitution).
  try {
    const infoResp = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!infoResp.ok) throw new Error(`HTTP ${infoResp.status}`);
    const info = await infoResp.json();
    if (info.aud !== process.env.GOOGLE_CLIENT_ID && info.azp !== process.env.GOOGLE_CLIENT_ID) {
      throw new Error('audience mismatch');
    }
  } catch (e) {
    throw { status: 401, code: 'OAUTH_INVALID_TOKEN', error: `Google access_token non valido: ${e.message}` };
  }

  // Verifica identità via userinfo endpoint: Google convalida l'access_token e
  // ci restituisce email/nome/sub solo se il token è valido e non scaduto.
  // Equivale al check crittografico di verifyIdToken ma sull'access_token.
  let userinfo;
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    userinfo = await resp.json();
  } catch (e) {
    throw { status: 401, code: 'OAUTH_INVALID_TOKEN', error: `Google access_token non valido: ${e.message}` };
  }

  // Birthday best-effort: se mancano scope/People API/data nel profilo è null
  // e ensureCitizenFromSocial userà il placeholder.
  const dataNascita = await fetchGoogleBirthday(accessToken);

  const user = await ensureCitizenFromSocial({
    email: userinfo.email,
    nome: userinfo.given_name,
    cognome: userinfo.family_name,
    providerId: userinfo.sub,
    provider: 'google',
    dataNascita,
  });
  return { user, token: signToken(user) };
}

async function loginWithApple(idToken) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw { status: 503, code: 'OAUTH_NOT_CONFIGURED', error: 'APPLE_CLIENT_ID non configurato' };
  let payload;
  try {
    payload = await verifyAppleIdToken(idToken, clientId);
  } catch (e) {
    throw { status: 401, code: 'OAUTH_INVALID_TOKEN', error: `Apple idToken non valido: ${e.message}` };
  }
  const user = await ensureCitizenFromSocial({
    email: payload.email,
    nome: undefined, // Apple non fornisce nome al verify (solo first sign-in via richiesta a parte)
    cognome: undefined,
    providerId: payload.sub,
    provider: 'apple',
  });
  return { user, token: signToken(user) };
}

// SPID demo: nessuna verifica vera in dev. Crea/usa un AmministratoreComunale.
// In produzione qui si integra spid-express o un IdP SPID reale.
// SECURITY: SPID è il canale di accesso ESCLUSIVO per AmministratoreComunale.
// Se l'email appartiene a un account con un ruolo diverso, rifiuta — non si
// può "promuovere" un cittadino o admin via SPID.
async function loginWithSpidStub({ spidId, nome, cognome, email, ufficio }) {
  if (!spidId || !email) throw { status: 400, code: 'SPID_MISSING', error: 'spidId e email obbligatori' };
  let user = await User.findOne({ where: { email } });
  if (user && user.ruolo !== 'AmministratoreComunale') {
    throw {
      status: 403,
      code: 'SPID_FORBIDDEN_ROLE',
      error: 'Questo account non è un amministratore comunale: SPID non è ammesso per il tuo ruolo.',
    };
  }
  if (!user) {
    const randomPw = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(randomPw, 12);
    const {
      AmministratoreComunaleProfile,
    } = require('../data/models');
    user = await sequelize.transaction(async (t) => {
      const u = await User.create({
        email,
        passwordHash,
        nome: nome || 'Comune',
        cognome: cognome || 'Trento',
        dataNascita: '1980-01-01',
        ruolo: 'AmministratoreComunale',
        emailVerified: true,
      }, { transaction: t });
      await AmministratoreComunaleProfile.create({
        userId: u.id,
        nome: nome || 'Comune',
        cognome: cognome || 'Trento',
        ufficio: ufficio || null,
        spidId,
      }, { transaction: t });
      return u;
    });
  }
  return { user, token: signToken(user) };
}

module.exports = { loginWithGoogle, loginWithApple, loginWithSpidStub };
