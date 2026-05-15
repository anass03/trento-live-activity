// Validatori per dati di registrazione italiani.
// - Codice fiscale: formato + algoritmo del carattere di controllo (D.M. 23/12/1976).
// - PEC: formato email + dominio plausibilmente certificato.

const CF_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;

const CF_ODD = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
  K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
  U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

const CF_EVEN = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
  K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
  U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
};

function normalizeCodiceFiscale(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function isValidCodiceFiscale(value) {
  const cf = normalizeCodiceFiscale(value);
  if (!CF_REGEX.test(cf)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const ch = cf[i];
    // posizione 1 (index 0) è dispari secondo l'algoritmo
    sum += (i % 2 === 0) ? CF_ODD[ch] : CF_EVEN[ch];
  }
  const expected = String.fromCharCode(65 + (sum % 26));
  return expected === cf[15];
}

// Provider PEC italiani noti (lista non esaustiva, copre la maggior parte dei casi).
const KNOWN_PEC_DOMAINS = [
  'pec.it', 'legalmail.it', 'pec.aruba.it', 'postecert.it', 'pec.poste.it',
  'gigapec.it', 'sicurezzapostale.it', 'ticertifica.it', 'pec.actalis.it',
  'pec.cgn.it', 'pec.giuffre.it', 'cert.legalmail.it', 'cert-posta.it',
  'pec.intesigroup.com', 'pec.aiga.it', 'cert.namirial.it', 'pec.libero.it',
  'arubapec.it',
];

function normalizePec(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidPec(value) {
  const email = normalizePec(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domain = email.split('@')[1];
  if (!domain) return false;
  // Una PEC vive su domini con "pec" nel nome o su provider certificati noti.
  if (/(^|\.)pec\./.test(domain) || /pec\.[a-z]+$/.test(domain) || domain.includes('legalmail')) return true;
  return KNOWN_PEC_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

module.exports = {
  isValidCodiceFiscale,
  normalizeCodiceFiscale,
  isValidPec,
  normalizePec,
};
