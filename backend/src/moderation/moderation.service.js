const { Report, Event } = require('../data/models');

async function createReport(userId, eventId, { tipo, descrizione }) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  // OCL C22: one report per user per event
  try {
    const report = await Report.create({
      userId, eventId, tipo, descrizione,
      stato: 'aperta', // OCL C23
    });
    return report;
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, code: 'ALREADY_REPORTED', error: 'You have already reported this event' };
    }
    throw e;
  }
}

async function listReports({ stato, page = 1, limit = 20 }) {
  const where = {};
  if (stato) where.stato = stato;
  const { rows, count } = await Report.findAndCountAll({
    where,
    include: [{ model: Event, as: 'event', attributes: ['id', 'titolo'] }],
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });
  return { reports: rows, total: count, page, limit };
}

async function getReport(id) {
  const report = await Report.findByPk(id, {
    include: [{ model: Event, as: 'event' }],
  });
  if (!report) throw { status: 404, code: 'NOT_FOUND', error: 'Report not found' };
  return report;
}

async function resolveReport(reportId, { azione }) {
  const report = await Report.findByPk(reportId, {
    include: [{ model: Event, as: 'event' }],
  });
  if (!report) throw { status: 404, code: 'NOT_FOUND', error: 'Report not found' };

  if (azione === 'rimuovi') {
    await report.event.destroy();
    await report.update({ stato: 'risolta' });
    return { message: 'Event removed and report resolved' };
  } else if (azione === 'archivia') {
    await report.update({ stato: 'risolta' });
    return { message: 'Report archived' };
  } else if (azione === 'in_lavorazione') {
    await report.update({ stato: 'in lavorazione' });
    return { message: 'Report marked as in progress' };
  }

  throw { status: 400, code: 'INVALID_ACTION', error: 'azione must be rimuovi, archivia, or in_lavorazione' };
}

module.exports = { createReport, listReports, getReport, resolveReport };
