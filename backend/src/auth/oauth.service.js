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

// Crea-o-recupera il cittadino. Per gli account social non c'è una password
// vera (passwordHash è un random hash) e la mail è considerata verificata
// (il provider l'ha già verificata).
//
// SECURITY (#bug-2025-05-15): Se l'email appartiene già a un account con ruolo
// privilegiato (admin di sistema, comune, ente), il login social DEVE essere
// rifiutato — altrimenti bypassiamo 2FA / SPID / verifica PEC e si entra
// senza i controlli previsti per quel ruolo. OAuth Google/Apple è esclusivo
// dei cittadini (UtenteRegistrato).
async function ensureCitizenFromSocial({ email, nome, cognome, providerId, provider }) {
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
    return existing;
  }

  // Nuovo utente social — niente password (placeholder casuale), niente CF
  // (lo aggiungerà dal profilo). Onboarding interessi resta da fare.
  const randomPw = crypto.randomBytes(24).toString('hex');
  const passwordHash = await bcrypt.hash(randomPw, 12);

  const user = await sequelize.transaction(async (t) => {
    const u = await User.create({
      email,
      passwordHash,
      nome: nome || email.split('@')[0],
      cognome: cognome || '',
      dataNascita: '2000-01-01', // placeholder, l'utente lo aggiornerà
      ruolo: 'UtenteRegistrato',
      emailVerified: true,
    }, { transaction: t });
    await CittadinoProfile.create({
      userId: u.id,
      nome: nome || email.split('@')[0],
      cognome: cognome || '',
      dataNascita: '2000-01-01',
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

async function loginWithGoogle(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw { status: 503, code: 'OAUTH_NOT_CONFIGURED', error: 'GOOGLE_CLIENT_ID non configurato' };
  const oauth = new OAuth2Client(clientId);
  let payload;
  try {
    const ticket = await oauth.verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch (e) {
    throw { status: 401, code: 'OAUTH_INVALID_TOKEN', error: `Google idToken non valido: ${e.message}` };
  }
  const user = await ensureCitizenFromSocial({
    email: payload.email,
    nome: payload.given_name,
    cognome: payload.family_name,
    providerId: payload.sub,
    provider: 'google',
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
