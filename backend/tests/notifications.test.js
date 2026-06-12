const notificationsService = require('../src/notifications/notifications.service');

jest.mock('../src/data/models', () => ({
  DeviceToken: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn(), findAll: jest.fn() },
  User: { findAll: jest.fn() },
}));
jest.mock('../src/notifications/push.service', () => ({
  sendToTokens: jest.fn().mockResolvedValue(undefined),
}));

const { DeviceToken } = require('../src/data/models');
const { sendToTokens } = require('../src/notifications/push.service');

const USER_ID = 'user-1';
const TOKEN = 'fcm-token-abc';

describe('Notifications Service — registerDeviceToken', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-NOT-01: creates a new DeviceToken row', async () => {
    DeviceToken.findOne.mockResolvedValue(null);
    DeviceToken.create.mockResolvedValue({ id: 'd-1', userId: USER_ID, token: TOKEN, platform: 'web' });
    const result = await notificationsService.registerDeviceToken(USER_ID, { token: TOKEN, platform: 'web' });
    expect(DeviceToken.create).toHaveBeenCalledWith({ userId: USER_ID, token: TOKEN, platform: 'web' });
    expect(result.token).toBe(TOKEN);
  });

  test('TC-NOT-02: re-associates an existing token to the new user', async () => {
    const update = jest.fn();
    DeviceToken.findOne.mockResolvedValue({ id: 'd-1', userId: 'other-user', token: TOKEN, platform: 'web', update });
    await notificationsService.registerDeviceToken(USER_ID, { token: TOKEN, platform: 'web' });
    expect(update).toHaveBeenCalledWith({ userId: USER_ID, platform: 'web' });
    expect(DeviceToken.create).not.toHaveBeenCalled();
  });

  test('TC-NOT-03: rejects missing token', async () => {
    await expect(notificationsService.registerDeviceToken(USER_ID, { token: '' }))
      .rejects.toMatchObject({ status: 400, code: 'MISSING_TOKEN' });
  });

  test('TC-NOT-04: rejects invalid platform', async () => {
    await expect(notificationsService.registerDeviceToken(USER_ID, { token: TOKEN, platform: 'symbian' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_PLATFORM' });
  });

  test('TC-NOT-04b: race — concurrent insert of the same token re-associates instead of 500', async () => {
    // Regression: findOne → null, ma un'altra richiesta inserisce il token
    // prima della create → SequelizeUniqueConstraintError finiva in 500.
    const update = jest.fn().mockResolvedValue(undefined);
    const row = { id: 'd-1', userId: 'other-user', token: TOKEN, platform: 'web', update };
    DeviceToken.findOne
      .mockResolvedValueOnce(null) // pre-check: token non ancora registrato
      .mockResolvedValueOnce(row); // re-fetch dopo la violazione UNIQUE
    DeviceToken.create.mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });

    const result = await notificationsService.registerDeviceToken(USER_ID, { token: TOKEN, platform: 'web' });
    expect(update).toHaveBeenCalledWith({ userId: USER_ID, platform: 'web' });
    expect(result).toBe(row);
  });

  test('TC-NOT-04c: non-unique create errors still propagate', async () => {
    DeviceToken.findOne.mockResolvedValue(null);
    DeviceToken.create.mockRejectedValue(new Error('db down'));
    await expect(notificationsService.registerDeviceToken(USER_ID, { token: TOKEN, platform: 'web' }))
      .rejects.toThrow('db down');
  });
});

describe('Notifications Service — unregisterDeviceToken', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-NOT-05: destroys matching token', async () => {
    DeviceToken.destroy.mockResolvedValue(1);
    await notificationsService.unregisterDeviceToken(USER_ID, TOKEN);
    expect(DeviceToken.destroy).toHaveBeenCalledWith({ where: { userId: USER_ID, token: TOKEN } });
  });

  test('TC-NOT-06: rejects missing token', async () => {
    await expect(notificationsService.unregisterDeviceToken(USER_ID, ''))
      .rejects.toMatchObject({ status: 400, code: 'MISSING_TOKEN' });
  });
});

describe('Notifications Service — sendTestPush', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-NOT-07: sends to all of the user\'s tokens', async () => {
    DeviceToken.findAll.mockResolvedValue([{ token: 'a' }, { token: 'b' }]);
    const result = await notificationsService.sendTestPush(USER_ID);
    expect(sendToTokens).toHaveBeenCalledWith(['a', 'b'], expect.objectContaining({ title: expect.any(String) }));
    expect(result).toEqual({ tokensTargeted: 2 });
  });

  test('TC-NOT-08: rejects when user has no token', async () => {
    DeviceToken.findAll.mockResolvedValue([]);
    await expect(notificationsService.sendTestPush(USER_ID))
      .rejects.toMatchObject({ status: 400, code: 'NO_DEVICE_TOKEN' });
    expect(sendToTokens).not.toHaveBeenCalled();
  });
});
