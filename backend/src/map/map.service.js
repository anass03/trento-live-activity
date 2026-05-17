const { POI, Activity, Event } = require('../data/models');
const {
  markerFromActivity,
  markerFromEvent,
  markerFromPOI,
  serializeActivity,
  serializeEvent,
} = require('../data/presenters');
const { reverseGeocode } = require('../lib/geocode');

function geocodeAndStore(record) {
  if (!record.latitudine || !record.longitudine || record.indirizzo) return;
  reverseGeocode(record.latitudine, record.longitudine)
    .then((address) => { if (address) record.update({ indirizzo: address }); })
    .catch(() => {});
}

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
  const poi = await POI.create(data);
  geocodeAndStore(poi);
  return poi;
}

async function updatePOI(id, updates) {
  const poi = await POI.findByPk(id);
  if (!poi) throw { status: 404, code: 'NOT_FOUND', error: 'POI not found' };
  if (updates.statoAffollamento && !['verde', 'giallo', 'rosso'].includes(updates.statoAffollamento)) {
    throw { status: 400, code: 'INVALID_STATUS', error: 'statoAffollamento must be verde, giallo, or rosso' };
  }
  const coordsChanged = (updates.latitudine && updates.latitudine !== poi.latitudine)
    || (updates.longitudine && updates.longitudine !== poi.longitudine);
  if (coordsChanged) updates.indirizzo = null; // will be re-geocoded below
  await poi.update(updates);
  if (coordsChanged) geocodeAndStore(poi);
  return poi;
}

async function deletePOI(id) {
  const poi = await POI.findByPk(id);
  if (!poi) throw { status: 404, code: 'NOT_FOUND', error: 'POI not found' };
  await poi.destroy();
}

async function getMapData() {
  const [pois, activities, events] = await Promise.all([
    POI.findAll({ order: [['nome', 'ASC']] }),
    Activity.findAll({
      where: { stato: 'attiva' },
      attributes: ['id', 'tipo', 'data', 'orarioInizio', 'maxPartecipanti', 'stato', 'latitudine', 'longitudine', 'poiId', 'createdAt'],
      include: [{ model: POI, as: 'poi', attributes: ['id', 'nome', 'statoAffollamento'] }],
      order: [['data', 'ASC']],
    }),
    Event.findAll({
      attributes: ['id', 'titolo', 'descrizione', 'categoria', 'badgeVerifica', 'latitudine', 'longitudine', 'poiId', 'data', 'orarioInizio', 'orarioFine', 'createdAt'],
      include: [{ model: POI, as: 'poi', attributes: ['id', 'nome', 'statoAffollamento'] }],
      order: [['data', 'ASC']],
    }),
  ]);

  const hasCoordinates = (marker) => marker.latitude != null && marker.longitude != null;
  const markers = [
    ...pois.map(markerFromPOI),
    ...activities.map(markerFromActivity),
    ...events.map(markerFromEvent),
  ].filter(hasCoordinates);

  return {
    markers,
    pois,
    activities: activities.map(serializeActivity),
    events: events.map(serializeEvent),
  };
}

module.exports = { listPOIs, getPOI, createPOI, updatePOI, deletePOI, getMapData };
