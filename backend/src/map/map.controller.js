const service = require('./map.service');
const { assertUuid } = require('../data/presenters');
const { reverseGeocode } = require('../lib/geocode');
const logger = require('../lib/logger');

async function getMap(req, res, next) {
  try { res.json(await service.getMapData()); } catch (e) { next(e); }
}

async function listPOIs(req, res, next) {
  try { res.json(await service.listPOIs(req.query)); } catch (e) { next(e); }
}

async function getPOI(req, res, next) {
  try {
    assertUuid(req.params.id, 'POI id');
    res.json(await service.getPOI(req.params.id));
  } catch (e) { next(e); }
}

async function createPOI(req, res, next) {
  try {
    const poi = await service.createPOI(req.body);
    logger.audit('poi.create', { actorId: req.user?.id, poiId: poi.id, nome: poi.nome });
    res.status(201).json(poi);
  } catch (e) { next(e); }
}

async function updatePOI(req, res, next) {
  try {
    assertUuid(req.params.id, 'POI id');
    const poi = await service.updatePOI(req.params.id, req.body);
    logger.audit('poi.update', { actorId: req.user?.id, poiId: req.params.id });
    res.json(poi);
  } catch (e) { next(e); }
}

async function deletePOI(req, res, next) {
  try {
    assertUuid(req.params.id, 'POI id');
    await service.deletePOI(req.params.id);
    logger.audit('poi.delete', { actorId: req.user?.id, poiId: req.params.id });
    res.status(204).send();
  } catch (e) { next(e); }
}

async function geocode(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'lat and lon are required numbers' });
    }
    const address = await reverseGeocode(lat, lon);
    res.json({ address: address || null });
  } catch (e) { next(e); }
}

module.exports = { getMap, listPOIs, getPOI, createPOI, updatePOI, deletePOI, geocode };
