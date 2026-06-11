// Test del suggester AI: la risposta del modello è mockata, qui si verifica la
// validazione difensiva post-risposta (orari, capienza, data).

let mockText = '{}';
jest.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {
      this.models = { generateContent: async () => ({ text: mockText }) };
    }
  },
}));

const { suggestActivity } = require('../src/ai/ai.service');

function setResponse(obj) {
  mockText = JSON.stringify(obj);
}

const base = {
  tipo: 'sport',
  data: '2099-01-01',
  maxPartecipanti: 10,
  orarioInizio: '10:00',
  orarioFine: '12:00',
  reasoning: 'ok',
};

describe('AI Service — suggestActivity', () => {
  beforeAll(() => { process.env.GEMINI_API_KEY = 'test-key'; });

  test('TC-AI-01: rejects missing/short description with 400 (no API call)', async () => {
    await expect(suggestActivity({})).rejects.toMatchObject({ status: 400, code: 'MISSING_DESCRIPTION' });
    await expect(suggestActivity({ description: 'ab' })).rejects.toMatchObject({ status: 400, code: 'MISSING_DESCRIPTION' });
  });

  test('TC-AI-02: passes through a valid suggestion', async () => {
    setResponse(base);
    const out = await suggestActivity({ description: 'calcetto sabato' });
    expect(out).toMatchObject({ tipo: 'sport', orarioInizio: '10:00', orarioFine: '12:00', maxPartecipanti: 10 });
  });

  test('TC-AI-03: rejects non-existent hour like 29:00 (was accepted by [0-2]\\d)', async () => {
    setResponse({ ...base, orarioInizio: '29:00', orarioFine: '30:00' });
    const out = await suggestActivity({ description: 'calcetto sabato' });
    expect(out.orarioInizio).toBe('18:00');
    expect(out.orarioFine).toBe('20:00');
  });

  test('TC-AI-04: normalizes orarioFine <= orarioInizio so createActivity will accept it', async () => {
    setResponse({ ...base, orarioInizio: '18:00', orarioFine: '17:00' });
    const out = await suggestActivity({ description: 'aperitivo' });
    expect(out.orarioFine).toBe('20:00'); // inizio + 2h
  });

  test('TC-AI-05: caps end-of-day overflow at 23:59 and never returns fine <= inizio', async () => {
    setResponse({ ...base, orarioInizio: '23:00', orarioFine: '23:00' });
    const out = await suggestActivity({ description: 'serata' });
    expect(out.orarioFine).toBe('23:59');
  });

  test('TC-AI-06: clamps maxPartecipanti into [2, 50] and defaults bad values to 10', async () => {
    setResponse({ ...base, maxPartecipanti: 500 });
    expect((await suggestActivity({ description: 'mega evento' })).maxPartecipanti).toBe(50);
    setResponse({ ...base, maxPartecipanti: 'tanti' });
    expect((await suggestActivity({ description: 'mega evento' })).maxPartecipanti).toBe(10);
  });

  test('TC-AI-07: past or malformed data falls back to today (OCL C9)', async () => {
    setResponse({ ...base, data: '2020-01-01' });
    const out = await suggestActivity({ description: 'calcetto' });
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(out.data).toBe(iso);
  });
});
