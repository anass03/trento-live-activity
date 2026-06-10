const trustService = require('../src/social/trust.service');
const socialEventsService = require('../src/social/socialEvents.service');
const socialActivitiesService = require('../src/social/socialActivities.service');
const reviewsService = require('../src/social/reviews.service');
const moderationService = require('../src/social/moderation.service');

// Mock Sequelize Models
jest.mock('../src/data/models', () => {
  const mockUserInstance = {
    id: 'user-1',
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario@example.com',
    ruolo: 'UtenteRegistrato',
    role: 'USER',
    verifiedProfile: true,
    authorTrustScore: 50,
    authorTrustLevel: 'GROWING',
    isSuspended: false,
    update: jest.fn().mockResolvedValue(true),
    increment: jest.fn().mockResolvedValue(true),
  };

  const mockActivityInstance = {
    id: 'act-1',
    title: 'Corsa sul Bondone',
    category: 'SPORT',
    creatorId: 'user-2',
    authorId: 'user-2',
    data: '2026-06-15',
    orarioInizio: '10:00',
    orarioFine: '12:00',
    status: 'ACTIVE',
    participantsCount: 0,
    capacity: 2,
    increment: jest.fn().mockResolvedValue(true),
    decrement: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
  };

  return {
    User: {
      findByPk: jest.fn().mockImplementation((id) => {
        if (id === 'user-1') return mockUserInstance;
        if (id === 'user-2') return { ...mockUserInstance, id: 'user-2', role: 'USER' };
        return null;
      }),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(2),
    },
    Activity: {
      findByPk: jest.fn().mockResolvedValue(mockActivityInstance),
      findAll: jest.fn().mockResolvedValue([mockActivityInstance]),
      count: jest.fn().mockResolvedValue(3),
      create: jest.fn().mockResolvedValue(mockActivityInstance),
      update: jest.fn().mockResolvedValue([1]),
    },
    Event: {
      findByPk: jest.fn().mockResolvedValue({
        id: 'evt-1',
        title: 'Concerto al MUSE',
        category: 'MUSIC',
        organizerId: 'user-2',
        status: 'PUBLISHED',
        participantsCount: 0,
        capacity: 100,
        increment: jest.fn().mockResolvedValue(true),
        decrement: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue(true),
      }),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    SocialParticipation: {
      findOne: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findOrCreate: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue([1]),
    },
    Review: {
      findOne: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
      create: jest.fn(),
    },
    Comment: {
      findAll: jest.fn().mockResolvedValue([]),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
      create: jest.fn(),
    },
    Reaction: {
      findOne: jest.fn(),
      findOrCreate: jest.fn(),
      destroy: jest.fn(),
    },
    SavedItem: {
      findOne: jest.fn(),
      findOrCreate: jest.fn(),
      destroy: jest.fn(),
    },
    SocialReport: {
      findOne: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
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

const { User, Activity, Event, SocialParticipation, Review, Reaction, SocialReport } = require('../src/data/models');

describe('User Trust scoring logic', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Calculates trust score correctly with verify profile bonuses', async () => {
    const mockUser = {
      id: 'user-1',
      nome: 'Mario',
      cognome: 'Rossi',
      verifiedProfile: true,
      role: 'USER',
      ruolo: 'UtenteRegistrato',
      isSuspended: false,
      update: jest.fn().mockResolvedValue(true),
    };
    User.findByPk.mockResolvedValue(mockUser);
    Activity.count.mockImplementation(async ({ where }) => {
      if (where && where.status === 'COMPLETED') return 5;
      if (where && where.status === 'CANCELLED') return 0;
      return 5; // published (ACTIVE, COMPLETED, CANCELLED)
    });
    Review.findOne.mockResolvedValue({
      avgOverall: 4.5,
      avgAccuracy: 4.0,
      avgOrg: 4.0,
      avgSafety: 4.0,
      avgAtmosphere: 4.0,
      count: 2
    });

    const breakdown = await trustService.calculateTrustScore('user-1');
    expect(breakdown.authorTrustScore).toBeGreaterThanOrEqual(50);
    expect(breakdown.authorTrustLevel).toBe('RELIABLE'); // Score >= 65 is RELIABLE
    expect(mockUser.update).toHaveBeenCalled();
  });
});

describe('Social Events Feed and Actions', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Join event updates participants count and maps Waitlisted status when full', async () => {
    const mockEvent = {
      id: 'evt-1',
      title: 'Concerto al MUSE',
      category: 'MUSIC',
      status: 'PUBLISHED',
      participantsCount: 10,
      capacity: 10, // Full
      increment: jest.fn().mockResolvedValue(true),
    };
    Event.findByPk.mockResolvedValue(mockEvent);
    SocialParticipation.findOrCreate.mockResolvedValue([
      { status: 'WAITLISTED', update: jest.fn() },
      true // created
    ]);

    const result = await socialEventsService.joinEventSocial('user-1', 'evt-1');
    expect(result.status).toBe('WAITLISTED');
  });

  test('Liking event increments likes count and returns liked flag', async () => {
    const mockEvent = {
      id: 'evt-1',
      likesCount: 5,
      increment: jest.fn().mockResolvedValue(true),
    };
    Event.findByPk.mockResolvedValue(mockEvent);
    Reaction.findOrCreate.mockResolvedValue([{ id: 'r1' }, true]); // created

    const result = await socialEventsService.toggleLikeEvent('user-1', 'evt-1', true);
    expect(result.liked).toBe(true);
  });
});

describe('Activities Catalog and Reviews', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Blocks reviews for users who have not attended the activity', async () => {
    // Return past activity
    Activity.findByPk.mockResolvedValue({
      id: 'act-1',
      creatorId: 'user-2',
      authorId: 'user-2',
      data: '2026-05-01', // Past
    });
    // No participation record
    SocialParticipation.findOne.mockResolvedValue(null);

    await expect(reviewsService.createReview('user-1', 'act-1', {
      ratingOverall: 5, ratingAccuracy: 5, ratingOrganization: 5, ratingSafety: 5, ratingAtmosphere: 5, comment: 'Nice!'
    })).rejects.toMatchObject({ code: 'NOT_ATTENDED' });
  });

  test('Allows review if user attended the activity', async () => {
    Activity.findByPk.mockResolvedValue({
      id: 'act-1',
      creatorId: 'user-2',
      authorId: 'user-2',
      data: '2026-05-01', // Past
    });
    // Attended participation
    SocialParticipation.findOne.mockResolvedValue({ status: 'ATTENDED' });
    Review.findOne.mockResolvedValue(null); // No duplicate review
    Review.create.mockResolvedValue({ id: 'rev-1' });

    const result = await reviewsService.createReview('user-1', 'act-1', {
      ratingOverall: 5, ratingAccuracy: 5, ratingOrganization: 5, ratingSafety: 5, ratingAtmosphere: 5, comment: 'Nice!'
    });
    expect(result).toBeDefined();
  });
});

describe('Social Moderation Reports', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Submits social abuse report and throws error on target not found', async () => {
    // Target user does not exist
    User.findByPk.mockResolvedValue(null);

    await expect(moderationService.createSocialReport('user-1', {
      targetType: 'USER', targetId: 'user-nonexistent', reason: 'SPAM', description: 'Annoying posts'
    })).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
  });
});
