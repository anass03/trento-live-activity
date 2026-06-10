const request = require('supertest');
const express = require('express');

// Mock Sequelize Models
jest.mock('../src/data/models', () => {
  const mockUserSettingsInstance = {
    id: 'settings-1',
    userId: 'user-1',
    themeMode: 'system',
    visualEffects: 'full',
    language: 'it',
    timeFormat: '24h',
    distanceUnit: 'km',
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: false,
    eventNotificationsEnabled: true,
    activityNotificationsEnabled: true,
    cityAlertNotificationsEnabled: true,
    locationMode: 'while_using',
    participationVisibility: 'public',
    showProfileInParticipants: true,
    interestsJson: ['music', 'outdoor'],
    showOnlyReliableActivities: false,
    showVerifiedActivities: false,
    reduceAnimations: false,
    increaseContrast: false,
    largerText: false,
    update: jest.fn().mockImplementation(function (updates) {
      Object.assign(this, updates);
      return Promise.resolve(this);
    }),
    reload: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
  };

  const mockUserInstance = {
    id: 'user-1',
    nome: 'Mario',
    cognome: 'Rossi',
    avatarUrl: '/avatars/mario.jpg',
    authorTrustLevel: 'RELIABLE',
    verifiedProfile: true,
  };

  return {
    UserSettings: {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.userId === 'user-1') return Promise.resolve(mockUserSettingsInstance);
        if (where.userId === 'user-private') {
          return Promise.resolve({
            ...mockUserSettingsInstance,
            userId: 'user-private',
            showProfileInParticipants: false,
          });
        }
        if (where.userId === 'user-only-reliable') {
          return Promise.resolve({
            ...mockUserSettingsInstance,
            userId: 'user-only-reliable',
            showOnlyReliableActivities: true,
          });
        }
        if (where.userId === 'user-only-verified') {
          return Promise.resolve({
            ...mockUserSettingsInstance,
            userId: 'user-only-verified',
            showVerifiedActivities: true,
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        ...mockUserSettingsInstance,
        ...data,
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue(true),
      })),
    },
    User: {
      findByPk: jest.fn().mockImplementation((id) => {
        if (id === 'user-1') return Promise.resolve(mockUserInstance);
        if (id === 'user-low-trust') {
          return Promise.resolve({ ...mockUserInstance, id: 'user-low-trust', authorTrustLevel: 'NEW' });
        }
        return Promise.resolve(null);
      }),
    },
    Consent: {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'c1' }),
    },
    DeviceToken: {
      destroy: jest.fn().mockResolvedValue(1),
    },
    SocialParticipation: {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'p1',
          userId: 'user-1',
          status: 'JOINED',
          joinedAt: new Date(),
          user: {
            id: 'user-1',
            nome: 'Mario',
            cognome: 'Rossi',
            avatarUrl: '/avatars/mario.jpg',
            authorTrustLevel: 'RELIABLE',
            verifiedProfile: true,
            settings: { showProfileInParticipants: true, participationVisibility: 'public' },
          },
        },
        {
          id: 'p2',
          userId: 'user-private',
          status: 'JOINED',
          joinedAt: new Date(),
          user: {
            id: 'user-private',
            nome: 'Luigi',
            cognome: 'Verdi',
            avatarUrl: null,
            authorTrustLevel: 'NEW',
            verifiedProfile: false,
            settings: { showProfileInParticipants: false, participationVisibility: 'public' },
          },
        },
      ]),
    },
    Event: {
      findByPk: jest.fn().mockResolvedValue({ id: 'evt-1', organizerId: 'user-1' }),
      findAll: jest.fn().mockResolvedValue([]),
    },
    Activity: {
      findByPk: jest.fn().mockResolvedValue({ id: 'act-1', authorId: 'user-1' }),
      findAll: jest.fn().mockResolvedValue([]),
    },
    POI: {
      findByPk: jest.fn(),
    },
    sequelize: {
      fn: jest.fn(),
      col: jest.fn(),
    },
  };
});

// Mock authenticate middleware
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'user-1', role: 'USER', ruolo: 'UtenteRegistrato' };
    next();
  },
  optionalAuth: (req, res, next) => {
    req.user = { id: 'user-1', role: 'USER', ruolo: 'UtenteRegistrato' };
    next();
  },
}));

const { UserSettings, Consent, DeviceToken } = require('../src/data/models');
const settingsRoutes = require('../src/social/settings.routes');
const socialUserService = require('../src/social/socialUser.service');
const errorHandler = require('../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/me/settings', settingsRoutes);
app.use(errorHandler);

describe('User Settings API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/me/settings retrieves existing settings', async () => {
    const res = await request(app).get('/api/me/settings');
    expect(res.status).toBe(200);
    expect(res.body.appearance.themeMode).toBe('system');
    expect(res.body.languageFormat.language).toBe('it');
    expect(res.body.notifications.emailEnabled).toBe(true);
  });

  test('PATCH /api/me/settings/appearance updates theme', async () => {
    const res = await request(app)
      .patch('/api/me/settings/appearance')
      .send({ themeMode: 'dark', visualEffects: 'reduced' });

    expect(res.status).toBe(200);
    expect(res.body.themeMode).toBe('dark');
    expect(res.body.visualEffects).toBe('reduced');
  });

  test('PATCH /api/me/settings/appearance rejects invalid values', async () => {
    const res = await request(app)
      .patch('/api/me/settings/appearance')
      .send({ themeMode: 'blue' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('PATCH /api/me/settings/notifications writes consent logs and cleans device tokens on opt-out', async () => {
    const res = await request(app)
      .patch('/api/me/settings/notifications')
      .send({ emailEnabled: false, pushEnabled: false });

    expect(res.status).toBe(200);
    expect(Consent.create).toHaveBeenCalled();
    expect(DeviceToken.destroy).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  test('PATCH /api/me/settings/preferences rejects invalid interests', async () => {
    const res = await request(app)
      .patch('/api/me/settings/preferences')
      .send({ interests: ['music', 'extraterrestrial-activities'] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('PATCH /api/me/settings updates multiple sections at once', async () => {
    const res = await request(app)
      .patch('/api/me/settings')
      .send({
        appearance: { themeMode: 'light' },
        accessibility: { reduceAnimations: true },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.appearance.themeMode).toBe('light');
    expect(res.body.settings.accessibility.reduceAnimations).toBe(true);
  });
});

describe('User Settings Integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Participants list anonymizes user profile if setting is private', async () => {
    // requester: 'user-other' (not the organizer and not the user themself)
    const list = await socialUserService.getParticipantsList('EVENT', 'evt-1', 'user-other', 'USER');

    const participant1 = list.find(p => p.userId === 'user-1');
    const participant2 = list.find(p => p.userId === null); // Anonymized

    expect(participant1).toBeDefined();
    expect(participant1.user.name).toBe('Mario Rossi');

    expect(participant2).toBeDefined();
    expect(participant2.user.name).toBe('Partecipante privato');
    expect(participant2.user.isPrivate).toBe(true);
  });

  test('Participants list does NOT anonymize if requester is the user themself', async () => {
    const list = await socialUserService.getParticipantsList('EVENT', 'evt-1', 'user-private', 'USER');
    const participant2 = list.find(p => p.userId === 'user-private');

    expect(participant2).toBeDefined();
    expect(participant2.user.name).toBe('Luigi Verdi');
  });

  test('Participants list does NOT anonymize if requester is an ADMIN', async () => {
    const list = await socialUserService.getParticipantsList('EVENT', 'evt-1', 'admin-user', 'ADMIN');
    const participant2 = list.find(p => p.userId === 'user-private');

    expect(participant2).toBeDefined();
    expect(participant2.user.name).toBe('Luigi Verdi');
  });
});
