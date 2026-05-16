// AI suggester per la creazione di attività spontanee.
// Modello: Claude Haiku 4.5 (claude-haiku-4-5-20251001).
// Cache prompt: il system prompt che elenca categorie/regole è marcato
// cache_control:ephemeral per ridurre il costo dei prompt ricorrenti.

const VALID_TIPI = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'studio'];
const MIN_PART = 2;
const MAX_PART = 50;

// Costruzione lazy del client per non rompere i test che non hanno la dipendenza
// né la API key, e per non fallire al boot se la dotenv non l'ha caricata.
let client = null;
function getClient() {
  if (client) return client;
  // eslint-disable-next-line global-require
  const Anthropic = require('@anthropic-ai/sdk');
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `Sei un assistente che aiuta i cittadini di Trento a creare attività sociali sulla piattaforma Trento Live Activity.

Le attività spontanee usano SOLO valori predefiniti:
- tipo (categoria): uno fra ${VALID_TIPI.join(', ')}
- maxPartecipanti: intero fra ${MIN_PART} e ${MAX_PART}
- orarioInizio / orarioFine: formato HH:MM (24h)

Regole:
- Se l'utente descrive un'attività sportiva (calcetto, padel, running, basket, …) → tipo "sport".
- Se è qualcosa legato a esposizioni, libri, conferenze, mostre → tipo "cultura".
- Se è jam session, concerto, ascolto musica → tipo "musica".
- Se è arte visiva, atelier, performance → tipo "arte".
- Se è cibo, aperitivo, ristorante, food tour → tipo "gastronomia".
- Se è gruppo di studio, ripetizioni, biblioteca → tipo "studio".
- Stima maxPartecipanti in base alla descrizione (default 10 se incerto).
- Se manca l'orario suggerisci 18:00-20:00 (orario aperitivo serale).

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza markdown né testo aggiuntivo:
{"tipo":"...","maxPartecipanti":...,"orarioInizio":"HH:MM","orarioFine":"HH:MM","reasoning":"breve spiegazione in italiano"}`;

async function suggestActivity({ description, location, time } = {}) {
  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    throw { status: 400, code: 'MISSING_DESCRIPTION', error: 'description è obbligatoria (min 3 caratteri)' };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw { status: 503, code: 'AI_UNAVAILABLE', error: 'AI suggester non configurato (manca ANTHROPIC_API_KEY)' };
  }

  const userMessage = [
    `Descrizione: ${description.trim()}`,
    location ? `Luogo: ${location}` : null,
    time ? `Orario indicativo: ${time}` : null,
  ].filter(Boolean).join('\n');

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // Prompt caching su Anthropic: blocchi marcati ephemeral vengono
        // riutilizzati cross-request riducendo costo e latenza.
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  // Estrai il testo dalla risposta
  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fallback: estrai il primo blocco JSON con regex
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw { status: 502, code: 'AI_INVALID_RESPONSE', error: 'Risposta AI non parseabile' };
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
  if (!/^[0-2]\d:[0-5]\d$/.test(parsed.orarioInizio || '')) parsed.orarioInizio = '18:00';
  if (!/^[0-2]\d:[0-5]\d$/.test(parsed.orarioFine || '')) parsed.orarioFine = '20:00';

  return parsed;
}

module.exports = { suggestActivity };
