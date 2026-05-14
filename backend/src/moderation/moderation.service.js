const { Report, Event, User } = require('../data/models');
const {
  sendReportCreated,
  sendContentRemoved,
  sendReportOutcome: emailReportOutcome,
} = require('../notifications/email.service');
const { sendReportOutcome: pushReportOutcome } = require('../notifications/push.service');

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

  // Cache info needed for notifications BEFORE we mutate state
  const reporter = report.userId ? await User.findByPk(report.userId, { attributes: ['id', 'email'] }) : null;
  const eventTitolo = report.event?.titolo || 'evento';

  if (azione === 'rimuovi') {
    const entity = await User.findByPk(report.event.entityId, { attributes: ['email'] });
    const eventId = report.event.id;

    // Reports referencing the event must be destroyed first (FK with no CASCADE)
    // — but capture all reporter ids first so we can notify them about the outcome.
    const allReports = await Report.findAll({ where: { eventId }, attributes: ['userId'] });
    const reporterIds = allReports.map((r) => r.userId).filter(Boolean);
    const reporters = await User.findAll({ where: { id: reporterIds }, attributes: ['id', 'email'] });

    await Report.destroy({ where: { eventId } });
    await report.event.destroy();

    if (entity) sendContentRemoved(entity.email, eventTitolo).catch(() => {});

    // DSA (RNF24): inform every reporter of the outcome.
    reporters.forEach((r) => {
      if (r.email) emailReportOutcome(r.email, eventTitolo, 'rimosso').catch(() => {});
      pushReportOutcome(r.id, eventTitolo, 'rimosso').catch(() => {});
    });
    return { message: 'Event removed and report resolved' };
  } else if (azione === 'archivia') {
    await report.update({ stato: 'risolta' });
    if (reporter?.email) emailReportOutcome(reporter.email, eventTitolo, 'archiviato').catch(() => {});
    if (reporter?.id) pushReportOutcome(reporter.id, eventTitolo, 'archiviato').catch(() => {});
    return { message: 'Report archived' };
  } else if (azione === 'in_lavorazione') {
    await report.update({ stato: 'in lavorazione' });
    if (reporter?.email) emailReportOutcome(reporter.email, eventTitolo, 'in_lavorazione').catch(() => {});
    if (reporter?.id) pushReportOutcome(reporter.id, eventTitolo, 'in_lavorazione').catch(() => {});
    return { message: 'Report marked as in progress' };
  }

  throw { status: 400, code: 'INVALID_ACTION', error: 'azione must be rimuovi, archivia, or in_lavorazione' };
}

module.exports = { createReport, listReports, getReport, resolveReport };
