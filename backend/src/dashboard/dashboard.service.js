const { sequelize, Activity, Event, Participation, POI, User } = require('../data/models');
const { Op } = require('sequelize');

// RF29: filter activities/events by geographic area using a bounding box
// derived from a center point + radius (km). Approximate: ~111 km per latitude
// degree, longitude scaled by cosine.
function boundingBox({ centerLat, centerLng, radiusKm }) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));
  return {
    latitudine: { [Op.between]: [centerLat - latDelta, centerLat + latDelta] },
    longitudine: { [Op.between]: [centerLng - lngDelta, centerLng + lngDelta] },
  };
}

async function getStats({ tipo, da, a, centerLat, centerLng, radiusKm, poiId } = {}) {
  const dateWhere = {};
  if (da) dateWhere[Op.gte] = da;
  if (a) dateWhere[Op.lte] = a;
  const dateFilter = Object.keys(dateWhere).length ? { data: dateWhere } : {};

  // Geographic filter (RF29)
  let geoFilter = {};
  if (poiId) {
    geoFilter = { poiId };
  } else if (centerLat !== undefined && centerLng !== undefined && radiusKm) {
    geoFilter = boundingBox({
      centerLat: Number(centerLat),
      centerLng: Number(centerLng),
      radiusKm: Number(radiusKm),
    });
  }

  const activityWhere = { ...dateFilter, ...(tipo ? { tipo } : {}), ...geoFilter };
  const eventWhere = { ...geoFilter };
  const poiWhere = poiId ? { id: poiId } : (centerLat !== undefined ? geoFilter : {});

  const [
    totalUsers,
    totalActivities,
    totalEvents,
    totalPOIs,
    activitiesByType,
    poiCrowding,
    totalParticipations,
  ] = await Promise.all([
    User.count({ where: { ruolo: 'UtenteRegistrato' } }),
    Activity.count({ where: activityWhere }),
    Event.count({ where: eventWhere }),
    POI.count({ where: poiWhere }),
    Activity.findAll({
      attributes: ['tipo', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { ...dateFilter, ...geoFilter },
      group: ['tipo'],
      raw: true,
    }),
    POI.findAll({
      attributes: ['statoAffollamento', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: poiWhere,
      group: ['statoAffollamento'],
      raw: true,
    }),
    Participation.count(),
  ]);

  return {
    totalUsers,
    totalActivities,
    totalEvents,
    totalPOIs,
    totalParticipations,
    activitiesByType,
    poiCrowding,
    filters: { tipo, da, a, centerLat, centerLng, radiusKm, poiId },
  };
}

module.exports = { getStats };
