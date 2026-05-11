const activityService = require('../src/activities/activity.service');

jest.mock('../src/data/models', () => ({
  Activity: { create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn() },
  Participation: { create: jest.fn(), findOne: jest.fn(), count: jest.fn() },
  User: {},
}));

const { Activity, Participation } = require('../src/data/models');

const CREATOR_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const ACTIVITY_ID = 'act-1';

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const FUTURE_DATE = tomorrow.toISOString().split('T')[0];

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const PAST_DATE = yesterday.toISOString().split('T')[0];

const validPayload = {
  tipo: 'sport',
  data: FUTURE_DATE,
  orarioInizio: '10:00',
  orarioFine: '12:00',
  maxPartecipanti: 10,
};

function makeActivity(overrides = {}) {
  return {
    id: ACTIVITY_ID,
    creatorId: CREATOR_ID,
    stato: 'attiva',
    data: FUTURE_DATE,
    maxPartecipanti: 10,
    update: jest.fn(),
    ...overrides,
  };
}

describe('Activity Service — createActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-ACT-01: creates activity and auto-joins creator (OCL C10)', async () => {
    Activity.create.mockResolvedValue(makeActivity());
    Participation.create.mockResolvedValue({});

    await activityService.createActivity(CREATOR_ID, validPayload);

    expect(Activity.create).toHaveBeenCalledWith(expect.objectContaining({ stato: 'attiva', creatorId: CREATOR_ID }));
    expect(Participation.create).toHaveBeenCalledWith({ userId: CREATOR_ID, activityId: ACTIVITY_ID });
  });

  test('TC-ACT-02: rejects past date (OCL C9)', async () => {
    await expect(activityService.createActivity(CREATOR_ID, { ...validPayload, data: PAST_DATE }))
      .rejects.toMatchObject({ code: 'DATE_IN_PAST' });
  });

  test('TC-ACT-03: rejects end time <= start time (OCL C11)', async () => {
    await expect(activityService.createActivity(CREATOR_ID, { ...validPayload, orarioInizio: '14:00', orarioFine: '12:00' }))
      .rejects.toMatchObject({ code: 'INVALID_TIME' });
  });

  test('TC-ACT-04: rejects maxPartecipanti < 2 (OCL C8)', async () => {
    await expect(activityService.createActivity(CREATOR_ID, { ...validPayload, maxPartecipanti: 1 }))
      .rejects.toMatchObject({ code: 'INVALID_MAX_PARTECIPANTI' });
  });

  test('TC-ACT-05: rejects maxPartecipanti > 50 (OCL C8)', async () => {
    await expect(activityService.createActivity(CREATOR_ID, { ...validPayload, maxPartecipanti: 51 }))
      .rejects.toMatchObject({ code: 'INVALID_MAX_PARTECIPANTI' });
  });
});

describe('Activity Service — joinActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-ACT-06: rejects join when activity is full (OCL C13)', async () => {
    const activity = makeActivity({ participants: [] });
    activity.participants = [];
    Activity.findByPk.mockResolvedValue({ ...activity, include: [] });

    // Simulate full activity
    const fullActivity = {
      ...activity,
      maxPartecipanti: 2,
      stato: 'attiva',
      data: FUTURE_DATE,
    };
    Activity.findByPk.mockResolvedValue(fullActivity);
    Participation.count.mockResolvedValue(2);

    await expect(activityService.joinActivity(OTHER_USER_ID, ACTIVITY_ID))
      .rejects.toMatchObject({ code: 'ACTIVITY_FULL' });
  });

  test('TC-ACT-07: rejects duplicate join (OCL C18)', async () => {
    Activity.findByPk.mockResolvedValue(makeActivity({ maxPartecipanti: 10, stato: 'attiva', data: FUTURE_DATE }));
    Participation.count.mockResolvedValue(1);
    const uniqueError = new Error('Unique constraint');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    Participation.create.mockRejectedValue(uniqueError);

    await expect(activityService.joinActivity(OTHER_USER_ID, ACTIVITY_ID))
      .rejects.toMatchObject({ code: 'ALREADY_JOINED' });
  });

  test('TC-ACT-08: rejects join on non-active activity', async () => {
    Activity.findByPk.mockResolvedValue(makeActivity({ stato: 'cancellata' }));

    await expect(activityService.joinActivity(OTHER_USER_ID, ACTIVITY_ID))
      .rejects.toMatchObject({ code: 'ACTIVITY_NOT_ACTIVE' });
  });
});

describe('Activity Service — updateActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-ACT-09: rejects update from non-creator (OCL C12)', async () => {
    Activity.findByPk.mockResolvedValue(makeActivity({ creatorId: CREATOR_ID }));
    await expect(activityService.updateActivity(OTHER_USER_ID, ACTIVITY_ID, { tipo: 'sport' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('TC-ACT-10: allows creator to update (OCL C12)', async () => {
    const activity = makeActivity({ creatorId: CREATOR_ID });
    Activity.findByPk.mockResolvedValue(activity);
    await activityService.updateActivity(CREATOR_ID, ACTIVITY_ID, { tipo: 'cultura' });
    expect(activity.update).toHaveBeenCalled();
  });
});
