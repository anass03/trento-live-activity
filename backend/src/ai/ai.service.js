// AI suggester per la creazione di attività spontanee.
// Modello: Google Gemini 2.5 Flash (free tier su AI Studio).
// JSON mode nativo: il modello è forzato a restituire JSON strutturato
// tramite responseMimeType, eliminando il bisogno di parsing fragile.

const VALID_TIPI = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'studio'];
const MIN_PART = 2;
const MAX_PART = 50;

// Costruzione lazy del client per non rompere i test che non hanno la dipendenza
// né la API key, e per non fallire al boot se la dotenv non l'ha caricata.
let client = null;
function getClient() {
  if (client) return client;
  // eslint-disable-next-line global-require
  const { GoogleGenAI } = require('@google/genai');
  client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `Sei un assistente che aiuta i cittadini di Trento a creare attività sociali sulla piattaforma Trento Live Activity.

Le attività spontanee usano SOLO valori predefiniti:
- tipo (categoria): uno fra ${VALID_TIPI.join(', ')}
- maxPartecipanti: intero fra ${MIN_PART} e ${MAX_PART}
- data: formato YYYY-MM-DD (data del giorno dell'attività)
- orarioInizio / orarioFine: formato HH:MM (24h)

Regole categoria:
- Sportiva (calcetto, padel, running, basket, …) → tipo "sport".
- Esposizioni, libri, conferenze, mostre → tipo "cultura".
- Jam session, concerto, ascolto musica → tipo "musica".
- Arte visiva, atelier, performance → tipo "arte".
- Cibo, aperitivo, ristorante, food tour → tipo "gastronomia".
- Gruppo di studio, ripetizioni, biblioteca → tipo "studio".

Regole data (CRITICO — la data NON deve essere nel passato):
- "oggi", "stasera", "stamattina" → data = TODAY (vedi messaggio utente).
- "domani", "domani sera/mattina" → TODAY + 1 giorno.
- "dopodomani" → TODAY + 2 giorni.
- "sabato", "venerdì", ecc. → primo giorno futuro che corrisponde (mai oggi se è già passato).
- "settimana prossima" → TODAY + 7 giorni.
- "weekend" / "fine settimana" → prossimo sabato.
- Se non specificato → TODAY (oggi stesso).

Regole orario:
- Stima maxPartecipanti in base alla descrizione (default 10 se incerto).
- "sera" → 19:00-21:00, "pomeriggio" → 15:00-17:00, "mattina" → 10:00-12:00.
- Se manca → 18:00-20:00 (default aperitivo).

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con questa struttura:
{"tipo":"...","data":"YYYY-MM-DD","maxPartecipanti":...,"orarioInizio":"HH:MM","orarioFine":"HH:MM","reasoning":"breve spiegazione in italiano"}`;

// Schema JSON per response strutturata. Gemini lo usa come grammar constraint
// così il modello non può sbagliare il formato (no markdown, no testo extra).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: VALID_TIPI },
    data: { type: 'string' },
    maxPartecipanti: { type: 'integer' },
    orarioInizio: { type: 'string' },
    orarioFine: { type: 'string' },
    reasoning: { type: 'string' },
  },
  required: ['tipo', 'data', 'maxPartecipanti', 'orarioInizio', 'orarioFine', 'reasoning'],
};

// YYYY-MM-DD per la data corrente (timezone locale del server, sufficiente per Trento).
function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function suggestActivity({ description, location, time } = {}) {
  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    throw { status: 400, code: 'MISSING_DESCRIPTION', error: 'description è obbligatoria (min 3 caratteri)' };
  }
  if (!process.env.GEMINI_API_KEY) {
    throw { status: 503, code: 'AI_UNAVAILABLE', error: 'AI suggester non configurato (manca GEMINI_API_KEY)' };
  }

  const today = todayIso();
  const userMessage = [
    `TODAY: ${today}`,
    `Descrizione: ${description.trim()}`,
    location ? `Luogo: ${location}` : null,
    time ? `Orario indicativo: ${time}` : null,
  ].filter(Boolean).join('\n');

  let response;
  try {
    response = await getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        // Gemini 2.5 Flash ha "thinking" attivo di default: il modello consuma
        // token in ragionamento interno prima di emettere output. Con un budget
        // basso (300) finisce i token pensando e restituisce testo vuoto.
        // thinkingBudget=0 disabilita il thinking → comportamento simile a 2.0 Flash.
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 600,
        temperature: 0.4,
      },
    });
  } catch (e) {
    throw { status: 502, code: 'AI_UPSTREAM_ERROR', error: `Errore Gemini: ${e.message || 'unknown'}` };
  }

  const text = (response.text || '').trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fallback: estrai il primo blocco JSON con regex (improbabile con responseSchema)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      // Log diagnostico: stampa finish_reason e i primi 200 char per capire perché
      // il modello non ha prodotto JSON (safety filter, max_tokens, thinking, ecc.).
      const finishReason = response?.candidates?.[0]?.finishReason || 'unknown';
      // eslint-disable-next-line no-console
      console.error('[ai.service] Gemini empty/invalid response', {
        finishReason,
        textPreview: text.slice(0, 200),
      });
      throw {
        status: 502,
        code: 'AI_INVALID_RESPONSE',
        error: `Risposta AI non parseabile (finish_reason: ${finishReason})`,
      };
    }
    parsed = JSON.parse(match[0]);
  }

  // Validazione difensiva contro hallucinations
  if (!VALID_TIPI.includes(parsed.tipo)) {
    parsed.tipo = 'sport';
    parsed.reasoning = (parsed.reasoning || '') + ' (categoria normalizzata)';
  }
  const max = Number(parsed.maxPartecipanti);
  parsed.maxPartecipanti = Number.isFinite(max)
    ? Math.max(MIN_PART, Math.min(MAX_PART, Math.round(max)))
    : 10;
  // Regex stretta sulle ore: [0-2]\d accettava orari inesistenti come "29:30",
  // che createActivity avrebbe poi rifiutato (o peggio, rotto timeToMinutes).
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!TIME_RE.test(parsed.orarioInizio || '')) parsed.orarioInizio = '18:00';
  if (!TIME_RE.test(parsed.orarioFine || '')) parsed.orarioFine = '20:00';

  // Coerenza fine > inizio (OCL C11): un suggerimento con fine <= inizio verrebbe
  // rifiutato da createActivity. Normalizza a inizio + 2h (cap 23:59).
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  if (toMin(parsed.orarioFine) <= toMin(parsed.orarioInizio)) {
    const end = Math.min(toMin(parsed.orarioInizio) + 120, 23 * 60 + 59);
    if (end > toMin(parsed.orarioInizio)) {
      parsed.orarioFine = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
    } else {
      // inizio era 23:59: nessuno slot possibile in giornata → default serale
      parsed.orarioInizio = '18:00';
      parsed.orarioFine = '20:00';
    }
  }

  // Data: deve essere YYYY-MM-DD e non nel passato (OCL C9).
  // Se il modello sbaglia formato o restituisce una data passata, fallback a oggi.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.data || '') || parsed.data < today) {
    parsed.data = today;
  }

  return parsed;
}

module.exports = { suggestActivity };
