const { Report, Event, User } = require('../data/models');
const { sendReportCreated, sendContentRemoved } = require('../notifications/email.service');

async function createReport(userId, eventId, { tipo, descrizione }) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  // OCL C22: one report per user per event
  let report;
  try {
    report = await Report.create({
      userId, eventId, tipo, descrizione,
      stato: 'aperta', // OCL C23
    });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, code: 'ALREADY_REPORTED', error: 'You have already reported this event' };
    }
    throw e;
  }

  // RNF24: notify system admins of new report (fire-and-forget)
  User.findAll({ where: { ruolo: 'AmministratoreDiSistema' }, attributes: ['email'] })
    .then((admins) => sendReportCreated(admins.map((a) => a.email), event.titolo, tipo))
    .catch(() => {});

  return report;
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
    // fetch entity email before destroying the event
    const entity = await User.findByPk(report.event.userId, { attributes: ['email'] });
    const eventTitolo = report.event.titolo;
    await report.event.destroy();
    await report.update({ stato: 'risolta' });
    // RNF24: notify entity that their content was removed
    if (entity) sendContentRemoved(entity.email, eventTitolo).catch(() => {});
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
