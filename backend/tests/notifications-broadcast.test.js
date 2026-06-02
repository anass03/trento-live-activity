jest.mock('../src/data/models', () => ({
  DeviceToken: { findAll: jest.fn() },
  User: { findAll: jest.fn() },
}));
jest.mock('../src/notifications/push.service', () => ({
  sendToTokens: jest.fn().mockResolvedValue(undefined),
  sendBroadcast: jest.fn().mockResolvedValue({ tokensTargeted: 3, audience: 'all' }),
  getTokenStats: jest.fn().mockResolvedValue({ totalTokens: 5, usersReachable: 4, byPlatform: { web: 5 } }),
}));

const service = require('../src/notifications/notifications.service');
const push = require('../src/notifications/push.service');

const ACTOR = 'admin-1';

describe('Notifications Service — admin broadcast', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sends broadcast to a valid audience and returns reach', async () => {
    const res = await service.broadcast(ACTOR, { title: 'Allerta', body: 'Testo', audience: 'cittadini' });
    expect(push.sendBroadcast).toHaveBeenCalledWith({ title: 'Allerta', body: 'Testo', audience: 'cittadini' });
    expect(res.tokensTargeted).toBe(3);
  });

  test('defaults audience to "all" when omitted', async () => {
    await service.broadcast(ACTOR, { title: 'T', body: 'B' });
    expect(push.sendBroadcast).toHaveBeenCalledWith(expect.objectContaining({ audience: 'all' }));
  });

  test('trims title and body', async () => {
    await service.broadcast(ACTOR, { title: '  T  ', body: '  B  ', audience: 'all' });
    expect(push.sendBroadcast).toHaveBeenCalledWith(expect.objectContaining({ title: 'T', body: 'B' }));
  });

  test('rejects missing title', async () => {
    await expect(service.broadcast(ACTOR, { title: '', body: 'B' }))
      .rejects.toMatchObject({ status: 400, code: 'MISSING_TITLE' });
  });

  test('rejects missing body', async () => {
    await expect(service.broadcast(ACTOR, { title: 'T', body: '   ' }))
      .rejects.toMatchObject({ status: 400, code: 'MISSING_BODY' });
  });

  test('rejects invalid audience', async () => {
    await expect(service.broadcast(ACTOR, { title: 'T', body: 'B', audience: 'hackers' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_AUDIENCE' });
  });

  test('getStats proxies push reach stats', async () => {
    const stats = await service.getStats();
    expect(stats).toEqual({ totalTokens: 5, usersReachable: 4, byPlatform: { web: 5 } });
  });
});
