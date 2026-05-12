const service = require('./notifications.service');

async function registerDeviceToken(req, res, next) {
  try {
    const result = await service.registerDeviceToken(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function unregisterDeviceToken(req, res, next) {
  try {
    await service.unregisterDeviceToken(req.user.id, req.body.token);
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { registerDeviceToken, unregisterDeviceToken };
