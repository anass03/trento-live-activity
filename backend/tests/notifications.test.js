const notificationsService = require('../src/notifications/notifications.service');

jest.mock('../src/data/models', () => ({
  DeviceToken: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn() },
}));

const { DeviceToken } = require('../src/data/models');

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
