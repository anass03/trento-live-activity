const moderationService = require('../src/moderation/moderation.service');

jest.mock('../src/data/models', () => ({
  Report: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
  },
  Event: { findByPk: jest.fn() },
  User: {
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('../src/notifications/email.service', () => ({
  sendReportCreated: jest.fn().mockResolvedValue(undefined),
  sendContentRemoved: jest.fn().mockResolvedValue(undefined),
  sendReportOutcome: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/notifications/push.service', () => ({
  sendReportOutcome: jest.fn().mockResolvedValue(undefined),
}));

const { Report, Event } = require('../src/data/models');

const USER_ID = 'user-1';
const EVENT_ID = 'event-1';
const REPORT_ID = 'report-1';

describe('Moderation Service — createReport', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-MOD-01: creates a report with stato=aperta (OCL C23)', async () => {
    Event.findByPk.mockResolvedValue({ id: EVENT_ID, titolo: 'Bad event', entityId: 'ent-1' });
    Report.create.mockResolvedValue({ id: REPORT_ID, stato: 'aperta', tipo: 'spam' });
    const result = await moderationService.createReport(USER_ID, EVENT_ID, { tipo: 'spam' });
    expect(Report.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: USER_ID, eventId: EVENT_ID, tipo: 'spam', stato: 'aperta',
    }));
    expect(result.stato).toBe('aperta');
  });

  test('TC-MOD-02: rejects duplicate report (OCL C22)', async () => {
    Event.findByPk.mockResolvedValue({ id: EVENT_ID, titolo: 'Bad event', entityId: 'ent-1' });
    const err = new Error('unique constraint');
    err.name = 'SequelizeUniqueConstraintError';
    Report.create.mockRejectedValue(err);
    await expect(moderationService.createReport(USER_ID, EVENT_ID, { tipo: 'spam' }))
      .rejects.toMatchObject({ status: 409, code: 'ALREADY_REPORTED' });
  });

  test('TC-MOD-03: rejects report on non-existent event', async () => {
    Event.findByPk.mockResolvedValue(null);
    await expect(moderationService.createReport(USER_ID, EVENT_ID, { tipo: 'spam' }))
      .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('Moderation Service — resolveReport', () => {
  beforeEach(() => jest.clearAllMocks());

  function makeReport(eventOverrides = {}) {
    const event = {
      id: EVENT_ID, titolo: 'Bad event', entityId: 'ent-1',
      destroy: jest.fn(),
      ...eventOverrides,
    };
    return {
      id: REPORT_ID, stato: 'aperta', event,
      update: jest.fn(),
    };
  }

  test('TC-MOD-04: rimuovi destroys all reports then the event', async () => {
    const report = makeReport();
    Report.findByPk.mockResolvedValue(report);
    const result = await moderationService.resolveReport(REPORT_ID, { azione: 'rimuovi' });
    expect(Report.destroy).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(report.event.destroy).toHaveBeenCalled();
    expect(result.message).toMatch(/removed/i);
  });

  test('TC-MOD-05: archivia marks report risolta without deleting event', async () => {
    const report = makeReport();
    Report.findByPk.mockResolvedValue(report);
    await moderationService.resolveReport(REPORT_ID, { azione: 'archivia' });
    expect(report.event.destroy).not.toHaveBeenCalled();
    expect(report.update).toHaveBeenCalledWith({ stato: 'risolta' });
  });

  test('TC-MOD-06: in_lavorazione transitions state', async () => {
    const report = makeReport();
    Report.findByPk.mockResolvedValue(report);
    await moderationService.resolveReport(REPORT_ID, { azione: 'in_lavorazione' });
    expect(report.update).toHaveBeenCalledWith({ stato: 'in lavorazione' });
  });

  test('TC-MOD-07: rejects unknown azione', async () => {
    Report.findByPk.mockResolvedValue(makeReport());
    await expect(moderationService.resolveReport(REPORT_ID, { azione: 'bogus' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_ACTION' });
  });
});
