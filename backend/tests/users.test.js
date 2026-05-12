const userService = require('../src/users/user.service');

jest.mock('../src/data/models', () => ({
  User: { findOne: jest.fn() },
}));
jest.mock('../src/data/presenters', () => ({
  serializeUser: (u) => u && { id: u.id, email: u.email, ruolo: u.ruolo },
}));

const { User } = require('../src/data/models');

describe('User Service — getCurrentUser (mock current user)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-USR-01: returns the user matching MOCK_CURRENT_USER_EMAIL', async () => {
    process.env.MOCK_CURRENT_USER_EMAIL = 'mario.rossi@example.com';
    User.findOne.mockResolvedValueOnce({ id: 'mario', email: 'mario.rossi@example.com', ruolo: 'UtenteRegistrato' });
    const result = await userService.getCurrentUser();
    expect(result.email).toBe('mario.rossi@example.com');
  });

  test('TC-USR-02: falls back to the first user if the seeded one is missing', async () => {
    User.findOne
      .mockResolvedValueOnce(null) // seeded lookup
      .mockResolvedValueOnce({ id: 'first', email: 'first@example.com', ruolo: 'UtenteRegistrato' });
    const result = await userService.getCurrentUser();
    expect(result.email).toBe('first@example.com');
  });
});
