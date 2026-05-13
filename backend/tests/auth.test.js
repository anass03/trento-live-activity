const authService = require('../src/auth/auth.service');

jest.mock('../src/data/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Consent: {
    bulkCreate: jest.fn().mockResolvedValue([]),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../src/notifications/email.service', () => ({
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
}));

const { User } = require('../src/data/models');

process.env.JWT_SECRET = 'test-secret';

const validUserData = {
  email: 'mario@example.com',
  password: 'Password123',
  nome: 'Mario',
  cognome: 'Rossi',
  dataNascita: '1995-06-15',
  consents: { privacy_policy: true, terms_of_service: true },
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

  test('TC-AUTH-11: admin without 2FA gets a setup-flag token instead of being rejected', async () => {
    const hash = await bcrypt.hash('Password123', 1);
    User.findOne.mockResolvedValue(makeFakeUser({
      passwordHash: hash,
      ruolo: 'AmministratoreDiSistema',
      twoFactorEnabled: false,
    }));

    const result = await authService.login({ email: validUserData.email, password: 'Password123' });
    expect(result.needs2faSetup).toBe(true);
    expect(result.token).toBeTruthy();
  });

  test('TC-AUTH-12: recovery code at login consumes only that code, 2FA stays enabled', async () => {
    const crypto = require('crypto');
    const code = 'ABCD-EFGH';
    const codeHash = crypto.createHash('sha256').update('ABCDEFGH').digest('hex');
    const hash = await bcrypt.hash('Password123', 1);
    const update = jest.fn().mockResolvedValue(undefined);
    User.findOne.mockResolvedValue(makeFakeUser({
      passwordHash: hash,
      ruolo: 'AmministratoreDiSistema',
      twoFactorEnabled: true,
      twoFactorSecret: 'BASE32SECRET',
      twoFactorRecoveryCodes: [codeHash, 'other-hash-1', 'other-hash-2'],
      update,
    }));

    const result = await authService.login({
      email: validUserData.email, password: 'Password123', otpToken: code,
    });
    expect(result.recoveryUsed).toBe(true);
    expect(result.recoveryCodesRemaining).toBe(2);
    expect(result.needs2faSetup).toBeUndefined();
    // Only the used code is removed; secret and twoFactorEnabled untouched
    expect(update).toHaveBeenCalledWith({
      twoFactorRecoveryCodes: ['other-hash-1', 'other-hash-2'],
    });
  });

  test('TC-AUTH-13: invalid recovery code is rejected', async () => {
    const hash = await bcrypt.hash('Password123', 1);
    User.findOne.mockResolvedValue(makeFakeUser({
      passwordHash: hash,
      ruolo: 'AmministratoreDiSistema',
      twoFactorEnabled: true,
      twoFactorSecret: 'BASE32SECRET',
      twoFactorRecoveryCodes: ['some-other-hash'],
    }));

    await expect(authService.login({
      email: validUserData.email, password: 'Password123', otpToken: 'WRNG-CODE',
    })).rejects.toMatchObject({ code: '2FA_INVALID' });
  });
});

describe('Auth Service — password reset (RF8)', () => {
  const { sendPasswordReset } = require('../src/notifications/email.service');

  beforeEach(() => jest.clearAllMocks());

  test('TC-AUTH-10: sends reset email for existing user', async () => {
    const fakeUser = makeFakeUser({ update: jest.fn() });
    User.findOne.mockResolvedValue(fakeUser);

    await authService.forgotPassword(validUserData.email);

    expect(fakeUser.update).toHaveBeenCalledWith(expect.objectContaining({
      passwordResetToken: expect.any(String),
      passwordResetExpires: expect.any(Date),
    }));
    expect(sendPasswordReset).toHaveBeenCalledWith(validUserData.email, expect.any(String));
  });

  test('TC-AUTH-11: silently succeeds for unknown email (no enumeration)', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(authService.forgotPassword('nobody@example.com')).resolves.toBeUndefined();
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });

  test('TC-AUTH-12: resets password with valid token', async () => {
    const crypto = require('crypto');
    const rawToken = 'validrawtoken123';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const fakeUser = makeFakeUser({
      passwordResetToken: tokenHash,
      passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
      update: jest.fn(),
    });
    User.findOne.mockResolvedValue(fakeUser);

    await authService.resetPassword(rawToken, 'NewPassword123');
    expect(fakeUser.update).toHaveBeenCalledWith(expect.objectContaining({
      passwordResetToken: null,
      passwordResetExpires: null,
    }));
  });

  test('TC-AUTH-13: rejects expired reset token', async () => {
    const crypto = require('crypto');
    const rawToken = 'expiredtoken';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const fakeUser = makeFakeUser({
      passwordResetToken: tokenHash,
      passwordResetExpires: new Date(Date.now() - 1000), // already expired
      update: jest.fn(),
    });
    User.findOne.mockResolvedValue(fakeUser);

    await expect(authService.resetPassword(rawToken, 'NewPassword123'))
      .rejects.toMatchObject({ code: 'TOKEN_INVALID' });
  });

  test('TC-AUTH-14: rejects weak password on reset', async () => {
    await expect(authService.resetPassword('anytoken', 'short'))
      .rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });
});
