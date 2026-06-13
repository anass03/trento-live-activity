const { sequelize, Activity, Event, Participation, POI, ServiceRequest } = require('../data/models');
const { Op } = require('sequelize');

// RF29: bounding box from center + radius (km)
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

  const activityWhere = { stato: 'attiva', ...dateFilter, ...(tipo ? { tipo } : {}), ...geoFilter };
  const eventWhere = { status: { [Op.notIn]: ['CANCELLED', 'ENDED'] }, ...geoFilter };
  const poiWhere = poiId ? { id: poiId } : (centerLat !== undefined ? geoFilter : {});

  // SCOPE RIDOTTO (#15): solo metriche aggregate, mai dati individuali.
  const [
    totalActivities,
    totalEvents,
    totalPOIs,
    activitiesByType,
    eventsByCategory,
    poiCrowding,
    topCrowdedPOIs,
    totalParticipations,
    poiByType,
    activitiesByDay,
    activitiesByHour,
  ] = await Promise.all([
    Activity.count({ where: activityWhere }),
    Event.count({ where: eventWhere }),
    POI.count({ where: poiWhere }),
    Activity.findAll({
      attributes: ['tipo', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { stato: 'attiva', ...dateFilter, ...geoFilter },
      group: ['tipo'],
      raw: true,
    }),
    Event.findAll({
      attributes: ['categoria', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: eventWhere,
      group: ['categoria'],
      raw: true,
    }),
    POI.findAll({
      attributes: ['statoAffollamento', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: poiWhere,
      group: ['statoAffollamento'],
      raw: true,
    }),
    // Top 10 POI per affollamento (rosso > giallo > verde)
    POI.findAll({
      attributes: ['id', 'nome', 'tipo', 'statoAffollamento', 'capacitaMax'],
      where: poiWhere,
      order: [
        [sequelize.literal(`CASE "statoAffollamento" WHEN 'rosso' THEN 3 WHEN 'giallo' THEN 2 ELSE 1 END`), 'DESC'],
        ['capacitaMax', 'DESC'],
      ],
      limit: 10,
      raw: true,
    }),
    Participation.count(),
    // POI breakdown by tipo (for demand/supply analysis)
    POI.findAll({
      attributes: ['tipo', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: poiWhere,
      group: ['tipo'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true,
    }),
    // 14-day activity creation trend
    Activity.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('Activity.createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: {
        stato: 'attiva',
        ...(tipo ? { tipo } : {}),
        ...geoFilter,
        createdAt: { [Op.gte]: sequelize.literal("NOW() - INTERVAL '14 days'") },
      },
      group: [sequelize.fn('DATE', sequelize.col('Activity.createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('Activity.createdAt')), 'ASC']],
      raw: true,
    }),
    // Activity peak start-hour distribution
    Activity.findAll({
      attributes: [
        [sequelize.literal(`LEFT("orarioInizio", 2)`), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: activityWhere,
      group: [sequelize.literal(`LEFT("orarioInizio", 2)`)],
      order: [[sequelize.literal(`LEFT("orarioInizio", 2)`), 'ASC']],
      raw: true,
    }),
  ]);

  return {
    totalActivities,
    totalEvents,
    totalPOIs,
    totalParticipations,
    activitiesByType,
    eventsByCategory,
    poiCrowding,
    topCrowdedPOIs,
    poiByType,
    activitiesByDay,
    activitiesByHour,
    filters: { tipo, da, a, centerLat, centerLng, radiusKm, poiId },
  };
}

// Aggregated service-request counts for the operator dashboard (scope ridotto: no userId exposed)
async function getServiceRequestStats({ centerLat, centerLng, radiusKm } = {}) {
  let geoFilter = {};
  if (centerLat !== undefined && centerLng !== undefined && radiusKm) {
    geoFilter = boundingBox({
      centerLat: Number(centerLat),
      centerLng: Number(centerLng),
      radiusKm: Number(radiusKm),
    });
  }

  const [byCategory, bySubcategory] = await Promise.all([
    ServiceRequest.findAll({
      attributes: ['categoria', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: geoFilter,
      group: ['categoria'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true,
    }),
    // Subcategory breakdown — only rows where sottocategoria is set (scope ridotto: no personal data)
    ServiceRequest.findAll({
      attributes: [
        'categoria',
        'sottocategoria',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { ...geoFilter, sottocategoria: { [Op.ne]: null } },
      group: ['categoria', 'sottocategoria'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true,
    }),
  ]);

  const total = byCategory.reduce((sum, r) => sum + Number(r.count), 0);
  return { byCategory, bySubcategory, total };
}

module.exports = { getStats, getServiceRequestStats };
