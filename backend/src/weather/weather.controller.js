const service = require('./weather.service');

async function getTrentoWeather(_req, res, next) {
  try {
    res.json(await service.getTrentoWeather());
  } catch (e) {
    next(e);
  }
}

module.exports = { getTrentoWeather };
