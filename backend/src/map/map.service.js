const { POI, Activity, Event } = require('../data/models');

async function listPOIs({ tipo } = {}) {
  const where = {};
  if (tipo) where.tipo = tipo;
  return POI.findAll({ where, order: [['nome', 'ASC']] });
}

async function getPOI(id) {
  const poi = await POI.findByPk(id);
  if (!poi) throw { status: 404, code: 'NOT_FOUND', error: 'POI not found' };
  return poi;
}

async function createPOI(data) {
  // OCL C20: capacitaMax > 0 (also enforced at model level)
  if (data.capacitaMax <= 0) {
    throw { status: 400, code: 'INVALID_CAPACITY', error: 'capacitaMax must be greater than 0' };
  }
  return POI.create(data);
}

async function updatePOI(id, updates) {
  const poi = await POI.findByPk(id);
  if (!poi) throw { status: 404, code: 'NOT_FOUND', error: 'POI not found' };
  if (updates.statoAffollamento && !['verde', 'giallo', 'rosso'].includes(updates.statoAffollamento)) {
    throw { status: 400, code: 'INVALID_STATUS', error: 'statoAffollamento must be verde, giallo, or rosso' };
  }
  await poi.update(updates);
  return poi;
}

async function deletePOI(id) {
  const poi = await POI.findByPk(id);
  if (!poi) throw { status: 404, code: 'NOT_FOUND', error: 'POI not found' };
  await poi.destroy();
}

async function getMapData() {
  const [pois, activities, events] = await Promise.all([
    POI.findAll(),
    Activity.findAll({ where: { stato: 'attiva' }, attributes: ['id', 'tipo', 'data', 'orarioInizio', 'latitudine', 'longitudine', 'poiId'] }),
    Event.findAll({ attributes: ['id', 'titolo', 'categoria', 'badgeVerifica', 'latitudine', 'longitudine', 'poiId'] }),
  ]);
  return { pois, activities, events };
}

module.exports = { listPOIs, getPOI, createPOI, updatePOI, deletePOI, getMapData };
