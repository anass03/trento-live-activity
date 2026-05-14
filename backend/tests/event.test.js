const eventService = require('../src/activities/event.service');

jest.mock('../src/data/models', () => ({
  Event: { create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), increment: jest.fn() },
  User: { findByPk: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
  Report: { count: jest.fn(), destroy: jest.fn().mockResolvedValue(0) },
  POI: { findByPk: jest.fn() },
}));
jest.mock('../src/notifications/push.service', () => ({
  sendNewEventToInterested: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/notifications/email.service', () => ({
  sendNewEventToInterested: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/data/presenters', () => ({
  serializeEvent: (e) => e,
}));

const { Event, User, Report } = require('../src/data/models');
const { sendNewEventToInterested } = require('../src/notifications/push.service');

const ENTITY_ID = 'entity-1';
const EVENT_ID = 'event-1';

function makeEntity(overrides = {}) {
  return { id: ENTITY_ID, ruolo: 'EnteCertificato', approvato: true, ...overrides };
}
function makeEvent(overrides = {}) {
  return {
    id: EVENT_ID, titolo: 'Test Event', categoria: 'cultura',
    entityId: ENTITY_ID, views: 0, update: jest.fn(),
    ...overrides,
  };
}

describe('Event Service — createEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-EV-01: approved entity publishes event (OCL C15, C24)', async () => {
    User.findByPk.mockResolvedValue(makeEntity());
    Event.create.mockResolvedValue(makeEvent());
    const result = await eventService.createEvent(ENTITY_ID, {
      titolo: 'Concerto', categoria: 'musica',
    });
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({
      titolo: 'Concerto', categoria: 'musica', badgeVerifica: true,
    }));
    expect(result.id).toBe(EVENT_ID);
    expect(sendNewEventToInterested).toHaveBeenCalled();
  });

  test('TC-EV-02: rejects publication from unapproved entity (OCL C24)', async () => {
    User.findByPk.mockResolvedValue(makeEntity({ approvato: false }));
    await expect(eventService.createEvent(ENTITY_ID, { titolo: 'X', categoria: 'arte' }))
      .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('TC-EV-03: rejects publication from non-entity user (OCL C15)', async () => {
    User.findByPk.mockResolvedValue({ ruolo: 'UtenteRegistrato', approvato: false });
    await expect(eventService.createEvent('user-1', { titolo: 'X', categoria: 'arte' }))
      .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('TC-EV-04: rejects empty title (OCL C17)', async () => {
    User.findByPk.mockResolvedValue(makeEntity());
    await expect(eventService.createEvent(ENTITY_ID, { titolo: '', categoria: 'arte' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_TITLE' });
  });

  test('TC-EV-05: rejects title > 100 chars (OCL C17)', async () => {
    User.findByPk.mockResolvedValue(makeEntity());
    await expect(eventService.createEvent(ENTITY_ID, { titolo: 'a'.repeat(101), categoria: 'arte' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_TITLE' });
  });
});

describe('Event Service — deleteEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-EV-08: entity deletes their own event (destroys reports first)', async () => {
    const evt = makeEvent({ destroy: jest.fn() });
    Event.findByPk.mockResolvedValue(evt);
    await eventService.deleteEvent(ENTITY_ID, EVENT_ID);
    expect(Report.destroy).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(evt.destroy).toHaveBeenCalled();
  });

  test('TC-EV-09: rejects delete from non-owner', async () => {
    Event.findByPk.mockResolvedValue(makeEvent());
    await expect(eventService.deleteEvent('other-entity', EVENT_ID))
      .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});

describe('Event Service — getEventStats (RF25)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-EV-06: returns views and reports count for owning entity', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ views: 42 }));
    Report.count.mockResolvedValue(3);
    const result = await eventService.getEventStats(ENTITY_ID, EVENT_ID);
    expect(result.views).toBe(42);
    expect(result.reports).toBe(3);
  });

  test('TC-EV-07: rejects stats request from non-owner', async () => {
    Event.findByPk.mockResolvedValue(makeEvent());
    await expect(eventService.getEventStats('other-entity', EVENT_ID))
      .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
