const service = require('./parking.service');

async function getParking(_req, res, next) {
  try {
    res.json(await service.getParking());
  } catch (e) {
    next(e);
  }
}

module.exports = { getParking };
