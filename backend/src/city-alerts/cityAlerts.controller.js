const service = require('./cityAlerts.service');

async function listTrentoAlerts(_req, res, next) {
  try {
    res.json(await service.listTrentoAlerts());
  } catch (e) {
    next(e);
  }
}

async function getAlert(req, res, next) {
  try {
    res.json(await service.getAlert(req.params.alertId));
  } catch (e) {
    next(e);
  }
}

module.exports = { listTrentoAlerts, getAlert };
