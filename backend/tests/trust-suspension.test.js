// Bugfix: suspendAuthor impostava user.isSuspended ma la colonna non esisteva
// sul modello User → l'update veniva scartato e la penalità -50 di
// trust.service non si applicava mai. Qui si verifica il comportamento del
// calcolo trust con un autore sospeso.
const { calculateTrustScore } = require('../src/social/trust.service');

jest.mock('../src/data/models', () => ({
  User: { findByPk: jest.fn() },
  Activity: { count: jest.fn().mockResolvedValue(0) },
  Review: { findOne: jest.fn().mockResolvedValue(null) },
  SocialReport: { count: jest.fn().mockResolvedValue(0) },
  sequelize: { fn: jest.fn(), col: jest.fn() },
}));

const { User } = require('../src/data/models');

function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    nome: 'Mario',
    cognome: 'Rossi',
    verifiedProfile: false,
    isSuspended: false,
    update: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('Trust Service — suspension penalty', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-TRUST-S1: suspended author gets the -50 penalty', async () => {
    const active = makeUser();
    User.findByPk.mockResolvedValue(active);
    const baseline = await calculateTrustScore('user-1');

    const suspended = makeUser({ isSuspended: true });
    User.findByPk.mockResolvedValue(suspended);
    const result = await calculateTrustScore('user-1');

    expect(result.authorTrustScore).toBe(Math.max(0, baseline.authorTrustScore - 50));
    expect(result.explanation).toContain('Account suspension penalty: -50');
  });

  test('TC-TRUST-S2: persisted update includes the recalculated score', async () => {
    const suspended = makeUser({ isSuspended: true });
    User.findByPk.mockResolvedValue(suspended);
    await calculateTrustScore('user-1');
    expect(suspended.update).toHaveBeenCalledWith(expect.objectContaining({
      authorTrustScore: expect.any(Number),
      authorTrustLevel: expect.any(String),
    }));
  });
});
