const { DeviceToken } = require('../data/models');

const VALID_PLATFORMS = ['web', 'ios', 'android'];

async function registerDeviceToken(userId, { token, platform = 'web' }) {
  if (!token) {
    throw { status: 400, code: 'MISSING_TOKEN', error: 'Device token is required' };
  }
  if (!VALID_PLATFORMS.includes(platform)) {
    throw { status: 400, code: 'INVALID_PLATFORM', error: `platform must be one of ${VALID_PLATFORMS.join(', ')}` };
  }

  // Same FCM token may be re-registered (login from a previously logged-out device).
  // Re-associate it with the current user.
  const existing = await DeviceToken.findOne({ where: { token } });
  if (existing) {
    if (existing.userId !== userId || existing.platform !== platform) {
      await existing.update({ userId, platform });
    }
    return existing;
  }
  return DeviceToken.create({ userId, token, platform });
}

async function unregisterDeviceToken(userId, token) {
  if (!token) {
    throw { status: 400, code: 'MISSING_TOKEN', error: 'Device token is required' };
  }
  await DeviceToken.destroy({ where: { userId, token } });
}

module.exports = { registerDeviceToken, unregisterDeviceToken };
