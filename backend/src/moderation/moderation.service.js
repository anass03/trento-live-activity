const { Report, Event, Activity, User } = require('../data/models');
const {
  sendReportCreated,
  sendContentRemoved,
  sendReportOutcome: emailReportOutcome,
} = require('../notifications/email.service');
const {
  sendReportCreated: pushReportCreated,
  sendReportOutcome: pushReportOutcome,
} = require('../notifications/push.service');

// Titolo "umano" del contenuto segnalato, qualunque sia l'entità.
function reportTitle(report) {
  if (report.event) return report.event.titolo || 'evento';
  if (report.activity) return report.activity.title || `Attività di ${report.activity.tipo || 'gruppo'}`;
  return 'contenuto';
}

// Segnala un evento (eventId) o un'attività (activityId): esattamente uno dei due.
async function createReport(userId, { eventId, activityId }, { tipo, descrizione }) {
  let titolo;
  if (eventId) {
    const event = await Event.findByPk(eventId);
    if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };
    titolo = event.titolo;
  } else {
    const activity = await Activity.findByPk(activityId);
    if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };
    titolo = activity.title || `Attività di ${activity.tipo || 'gruppo'}`;
  }

  // Guard #H3: TEXT in Postgres regge fino a 1 GB → un payload da MB blocca
  // l'admin UI e gonfia il DB. Inoltre input troppo grande è quasi sempre abuse.
  if (typeof descrizione === 'string' && descrizione.length > 2000) {
    throw { status: 400, code: 'DESCRIPTION_TOO_LONG', error: 'La descrizione non può superare i 2000 caratteri.' };
  }

  // OCL C22: one report per user per event/activity
  let report;
  try {
    report = await Report.create({
      userId,
      eventId: eventId || null,
      activityId: activityId || null,
      tipo, descrizione,
      stato: 'aperta', // OCL C23
    });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, code: 'ALREADY_REPORTED', error: 'You have already reported this content' };
    }
    throw e;
  }

  // RNF24: notify system admins of new report — email + push (fire-and-forget)
  User.findAll({ where: { ruolo: 'AmministratoreDiSistema' }, attributes: ['id', 'email'] })
    .then((admins) => Promise.allSettled([
      sendReportCreated(admins.map((a) => a.email), titolo, tipo),
      pushReportCreated(admins.map((a) => a.id), titolo, tipo),
    ]))
    .catch(() => {});

  return report;
}

const REPORT_INCLUDES = [
  { model: Event, as: 'event', attributes: ['id', 'titolo'] },
  { model: Activity, as: 'activity', attributes: ['id', 'title', 'tipo'] },
];

async function listReports({ stato, page = 1, limit = 20 }) {
  const where = {};
  if (stato) where.stato = stato;
  const { rows, count } = await Report.findAndCountAll({
    where,
    include: REPORT_INCLUDES,
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });
  return { reports: rows, total: count, page, limit };
}

async function getReport(id) {
  const report = await Report.findByPk(id, {
    include: [
      { model: Event, as: 'event' },
      { model: Activity, as: 'activity' },
    ],
  });
  if (!report) throw { status: 404, code: 'NOT_FOUND', error: 'Report not found' };
  return report;
}

// Rimozione del contenuto segnalato (evento o attività) + notifiche DSA.
async function removeReportedContent(report, titolo) {
  const isEvent = !!report.event;
  const target = isEvent ? report.event : report.activity;
  const where = isEvent ? { eventId: target.id } : { activityId: target.id };

  // L'autore del contenuto va avvisato della rimozione.
  const authorId = isEvent ? target.entityId : target.creatorId;
  const author = authorId ? await User.findByPk(authorId, { attributes: ['email'] }) : null;

  // Reports referencing the content must be destroyed first (FK with no CASCADE)
  // — but capture all reporter ids first so we can notify them about the outcome.
  const allReports = await Report.findAll({ where, attributes: ['userId'] });
  const reporterIds = allReports.map((r) => r.userId).filter(Boolean);
  const reporters = await User.findAll({ where: { id: reporterIds }, attributes: ['id', 'email'] });

  await Report.destroy({ where });
  await target.destroy();

  if (author) sendContentRemoved(author.email, titolo).catch(() => {});

  // DSA (RNF24): inform every reporter of the outcome.
  reporters.forEach((r) => {
    if (r.email) emailReportOutcome(r.email, titolo, 'rimosso').catch(() => {});
    pushReportOutcome(r.id, titolo, 'rimosso').catch(() => {});
  });
  return { message: `${isEvent ? 'Event' : 'Activity'} removed and report resolved` };
}

async function resolveReport(reportId, { azione }) {
  const report = await Report.findByPk(reportId, {
    include: [
      { model: Event, as: 'event' },
      { model: Activity, as: 'activity' },
    ],
  });
  if (!report) throw { status: 404, code: 'NOT_FOUND', error: 'Report not found' };

  // Cache info needed for notifications BEFORE we mutate state
  const reporter = report.userId ? await User.findByPk(report.userId, { attributes: ['id', 'email'] }) : null;
  const titolo = reportTitle(report);

  if (azione === 'rimuovi') {
    if (!report.event && !report.activity) {
      throw { status: 409, code: 'CONTENT_GONE', error: 'Il contenuto segnalato non esiste più.' };
    }
    return removeReportedContent(report, titolo);
  } else if (azione === 'archivia') {
    await report.update({ stato: 'risolta' });
    if (reporter?.email) emailReportOutcome(reporter.email, titolo, 'archiviato').catch(() => {});
    if (reporter?.id) pushReportOutcome(reporter.id, titolo, 'archiviato').catch(() => {});
    return { message: 'Report archived' };
  } else if (azione === 'in_lavorazione') {
    await report.update({ stato: 'in lavorazione' });
    if (reporter?.email) emailReportOutcome(reporter.email, titolo, 'in_lavorazione').catch(() => {});
    if (reporter?.id) pushReportOutcome(reporter.id, titolo, 'in_lavorazione').catch(() => {});
    return { message: 'Report marked as in progress' };
  }

  throw { status: 400, code: 'INVALID_ACTION', error: 'azione must be rimuovi, archivia, or in_lavorazione' };
}

module.exports = { createReport, listReports, getReport, resolveReport };
