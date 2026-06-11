const eventService = require('../src/activities/event.service');

jest.mock('../src/data/models', () => ({
  Event: { create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), increment: jest.fn() },
  User: { findByPk: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
  Report: { count: jest.fn(), destroy: jest.fn().mockResolvedValue(0) },
  POI: { findByPk: jest.fn() },
  EventParticipation: { findOne: jest.fn(), count: jest.fn(), create: jest.fn(), destroy: jest.fn() },
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

const { Event, User, Report, EventParticipation } = require('../src/data/models');
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

// ---------------------------------------------------------------------------
// Partecipazione agli eventi (join/leave) — robustezza capienza/doppioni/stati
// ---------------------------------------------------------------------------

const USER_ID = 'user-1';

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

describe('Event Service — joinEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-EV-10: joins and returns coherent participantCount', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ data: tomorrow, maxPartecipanti: 10 }));
    EventParticipation.findOne.mockResolvedValue(null);
    EventParticipation.count
      .mockResolvedValueOnce(3)   // pre-insert capacity check
      .mockResolvedValueOnce(4);  // post-insert recount
    EventParticipation.create.mockResolvedValue({ id: 'ep-1' });

    const result = await eventService.joinEvent(USER_ID, EVENT_ID);

    expect(EventParticipation.create).toHaveBeenCalledWith({ userId: USER_ID, eventId: EVENT_ID });
    expect(result).toEqual({ eventId: EVENT_ID, joined: true, participantCount: 4, maxPartecipanti: 10 });
  });

  test('TC-EV-11: rejects duplicate participation with 409', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ data: tomorrow }));
    EventParticipation.findOne.mockResolvedValue({ id: 'ep-1' });

    await expect(eventService.joinEvent(USER_ID, EVENT_ID))
      .rejects.toMatchObject({ status: 409, code: 'ALREADY_PARTICIPATING' });
    expect(EventParticipation.create).not.toHaveBeenCalled();
  });

  test('TC-EV-12: rejects join when event is full', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ data: tomorrow, maxPartecipanti: 5 }));
    EventParticipation.findOne.mockResolvedValue(null);
    EventParticipation.count.mockResolvedValue(5);

    await expect(eventService.joinEvent(USER_ID, EVENT_ID))
      .rejects.toMatchObject({ status: 409, code: 'EVENT_FULL' });
    expect(EventParticipation.create).not.toHaveBeenCalled();
  });

  test('TC-EV-13: rejects join on past event', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ data: yesterday }));

    await expect(eventService.joinEvent(USER_ID, EVENT_ID))
      .rejects.toMatchObject({ status: 400, code: 'EVENT_PAST' });
  });

  test('TC-EV-14: concurrent double-join (unique constraint) maps to 409, not 500', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ data: tomorrow, maxPartecipanti: 10 }));
    EventParticipation.findOne.mockResolvedValue(null);
    EventParticipation.count.mockResolvedValue(1);
    const uniqueError = new Error('duplicate key');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    EventParticipation.create.mockRejectedValue(uniqueError);

    await expect(eventService.joinEvent(USER_ID, EVENT_ID))
      .rejects.toMatchObject({ status: 409, code: 'ALREADY_PARTICIPATING' });
  });

  test('TC-EV-15: capacity race is compensated (insert rolled back, EVENT_FULL)', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ data: tomorrow, maxPartecipanti: 5 }));
    EventParticipation.findOne.mockResolvedValue(null);
    EventParticipation.count
      .mockResolvedValueOnce(4)   // pre-check passes (race window)
      .mockResolvedValueOnce(6);  // post-insert recount detects overflow
    const created = { id: 'ep-1', destroy: jest.fn().mockResolvedValue(undefined) };
    EventParticipation.create.mockResolvedValue(created);

    await expect(eventService.joinEvent(USER_ID, EVENT_ID))
      .rejects.toMatchObject({ status: 409, code: 'EVENT_FULL' });
    expect(created.destroy).toHaveBeenCalled();
  });

  test('TC-EV-16: event without maxPartecipanti never checks capacity', async () => {
    Event.findByPk.mockResolvedValue(makeEvent({ data: tomorrow, maxPartecipanti: null }));
    EventParticipation.findOne.mockResolvedValue(null);
    EventParticipation.count.mockResolvedValue(999);
    EventParticipation.create.mockResolvedValue({ id: 'ep-1' });

    const result = await eventService.joinEvent(USER_ID, EVENT_ID);
    expect(result.joined).toBe(true);
    expect(result.participantCount).toBe(999);
  });
});

describe('Event Service — leaveEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-EV-17: leaves and returns updated participantCount', async () => {
    EventParticipation.destroy.mockResolvedValue(1);
    EventParticipation.count.mockResolvedValue(2);

    const result = await eventService.leaveEvent(USER_ID, EVENT_ID);
    expect(EventParticipation.destroy).toHaveBeenCalledWith({ where: { userId: USER_ID, eventId: EVENT_ID } });
    expect(result).toEqual({ eventId: EVENT_ID, joined: false, participantCount: 2 });
  });

  test('TC-EV-18: 404 when not participating', async () => {
    EventParticipation.destroy.mockResolvedValue(0);

    await expect(eventService.leaveEvent(USER_ID, EVENT_ID))
      .rejects.toMatchObject({ status: 404, code: 'NOT_PARTICIPATING' });
  });
});

describe('Event Service — input validation hardening', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-EV-19: createEvent rejects invalid categoria (avoids Postgres enum 500)', async () => {
    User.findByPk.mockResolvedValue(makeEntity());
    await expect(eventService.createEvent(ENTITY_ID, { titolo: 'X', categoria: 'rave-illegale' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_CATEGORIA' });
    expect(Event.create).not.toHaveBeenCalled();
  });

  test('TC-EV-20: createEvent normalizes non-numeric/negative maxPartecipanti to null', async () => {
    User.findByPk.mockResolvedValue(makeEntity());
    Event.create.mockResolvedValue(makeEvent());
    await eventService.createEvent(ENTITY_ID, { titolo: 'X', categoria: 'arte', maxPartecipanti: 'abc' });
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({ maxPartecipanti: null }));

    await eventService.createEvent(ENTITY_ID, { titolo: 'X', categoria: 'arte', maxPartecipanti: -3 });
    expect(Event.create).toHaveBeenLastCalledWith(expect.objectContaining({ maxPartecipanti: null }));
  });

  test('TC-EV-21: updateEvent with titolo null returns 400, not a TypeError 500', async () => {
    Event.findByPk.mockResolvedValue(makeEvent());
    await expect(eventService.updateEvent(ENTITY_ID, EVENT_ID, { titolo: null }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_TITLE' });
  });

  test('TC-EV-22: updateEvent rejects invalid categoria', async () => {
    Event.findByPk.mockResolvedValue(makeEvent());
    await expect(eventService.updateEvent(ENTITY_ID, EVENT_ID, { categoria: 'nope' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_CATEGORIA' });
  });

  test('TC-EV-23: updateEvent rejects maxPartecipanti below current participants', async () => {
    Event.findByPk.mockResolvedValue(makeEvent());
    EventParticipation.count.mockResolvedValue(8);
    await expect(eventService.updateEvent(ENTITY_ID, EVENT_ID, { maxPartecipanti: 5 }))
      .rejects.toMatchObject({ status: 400, code: 'MAX_BELOW_PARTICIPANTS' });
  });

  test('TC-EV-24: updateEvent rejects non-numeric maxPartecipanti, allows null to clear', async () => {
    Event.findByPk.mockResolvedValue(makeEvent());
    await expect(eventService.updateEvent(ENTITY_ID, EVENT_ID, { maxPartecipanti: 'abc' }))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_MAX_PARTECIPANTI' });

    const evt = makeEvent();
    Event.findByPk.mockResolvedValue(evt);
    await eventService.updateEvent(ENTITY_ID, EVENT_ID, { maxPartecipanti: null });
    expect(evt.update).toHaveBeenCalledWith(expect.objectContaining({ maxPartecipanti: null }));
  });

  test('TC-EV-25: listEvents sanitizes NaN pagination (no OFFSET NaN 500)', async () => {
    Event.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const result = await eventService.listEvents({ page: Number('abc'), limit: Number('xyz') });
    expect(Event.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 20 }));
    expect(result.page).toBe(1);
  });
});
