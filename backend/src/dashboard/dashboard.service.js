const { sequelize, Activity, Event, Participation, POI, User } = require('../data/models');
const { Op } = require('sequelize');

async function getStats({ tipo, da, a } = {}) {
  const dateWhere = {};
  if (da) dateWhere[Op.gte] = da;
  if (a) dateWhere[Op.lte] = a;
  const dateFilter = Object.keys(dateWhere).length ? { data: dateWhere } : {};

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
    Activity.count({ where: { ...dateFilter, ...(tipo ? { tipo } : {}) } }),
    Event.count(),
    POI.count(),
    Activity.findAll({
      attributes: ['tipo', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { ...dateFilter },
      group: ['tipo'],
      raw: true,
    }),
    POI.findAll({
      attributes: ['statoAffollamento', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
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
  };
}

module.exports = { getStats };
