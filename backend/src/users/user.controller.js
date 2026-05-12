const service = require('./user.service');

async function getMe(_req, res, next) {
  try {
    res.json(await service.getCurrentUser());
  } catch (e) {
    next(e);
  }
}

module.exports = { getMe };
