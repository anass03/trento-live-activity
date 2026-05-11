const authService = require('../src/auth/auth.service');

jest.mock('../src/data/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

const { User } = require('../src/data/models');

process.env.JWT_SECRET = 'test-secret';

const validUserData = {
  email: 'mario@example.com',
  password: 'Password123',
  nome: 'Mario',
  cognome: 'Rossi',
  dataNascita: '1995-06-15',
};

function makeFakeUser(overrides = {}) {
  const data = {
    id: 'uuid-1',
    email: validUserData.email,
    passwordHash: '$2a$12$hashedpassword',
    nome: 'Mario',
    cognome: 'Rossi',
    ruolo: 'UtenteRegistrato',
    twoFactorEnabled: false,
    ...overrides,
  };
  return { ...data, toJSON: () => ({ ...data }) };
}

describe('Auth Service — register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-AUTH-01: registers a valid user and returns token', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(makeFakeUser());

    const result = await authService.register(validUserData);
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe(validUserData.email);
    expect(result.user.passwordHash).toBeUndefined();
  });

  test('TC-AUTH-02: rejects user under 13 years old (OCL C5)', async () => {
    await expect(authService.register({ ...validUserData, dataNascita: '2020-01-01' }))
      .rejects.toMatchObject({ code: 'AGE_TOO_YOUNG' });
  });

  test('TC-AUTH-03: rejects invalid email format (OCL C2)', async () => {
    await expect(authService.register({ ...validUserData, email: 'not-an-email' }))
      .rejects.toMatchObject({ code: 'INVALID_EMAIL' });
  });

  test('TC-AUTH-04: rejects duplicate email (OCL C7)', async () => {
    User.findOne.mockResolvedValue(makeFakeUser());
    await expect(authService.register(validUserData))
      .rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  test('TC-AUTH-05: rejects weak password', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(authService.register({ ...validUserData, password: 'short' }))
      .rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });
});

describe('Auth Service — login', () => {
  const bcrypt = require('bcryptjs');

  beforeEach(() => jest.clearAllMocks());

  test('TC-AUTH-06: returns token on valid credentials (OCL C1)', async () => {
    const hash = await bcrypt.hash('Password123', 1);
    User.findOne.mockResolvedValue(makeFakeUser({ passwordHash: hash }));

    const result = await authService.login({ email: validUserData.email, password: 'Password123' });
    expect(result.token).toBeDefined();
  });

  test('TC-AUTH-07: rejects wrong password', async () => {
    const hash = await bcrypt.hash('Password123', 1);
    User.findOne.mockResolvedValue(makeFakeUser({ passwordHash: hash }));

    await expect(authService.login({ email: validUserData.email, password: 'WrongPass1' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  test('TC-AUTH-08: rejects non-existent user', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(authService.login({ email: 'nobody@example.com', password: 'Password123' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  test('TC-AUTH-09: requires 2FA token for AmministratoreDiSistema (RNF15)', async () => {
    const hash = await bcrypt.hash('Password123', 1);
    User.findOne.mockResolvedValue(makeFakeUser({
      passwordHash: hash,
      ruolo: 'AmministratoreDiSistema',
      twoFactorEnabled: true,
      twoFactorSecret: 'BASE32SECRET',
    }));

    await expect(authService.login({ email: validUserData.email, password: 'Password123' }))
      .rejects.toMatchObject({ code: '2FA_REQUIRED' });
  });
});
