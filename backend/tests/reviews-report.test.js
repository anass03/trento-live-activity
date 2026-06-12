// Bugfix: reportReview incrementava reportedCount PRIMA di creare la
// SocialReport — su segnalazione duplicata l'unique index faceva esplodere
// la create (500) lasciando il contatore gonfiato. Ora: create prima (409 su
// duplicato), increment solo a creazione riuscita.
const reviewsService = require('../src/social/reviews.service');

jest.mock('../src/data/models', () => ({
  Review: { findByPk: jest.fn(), findOne: jest.fn() },
  Activity: { findByPk: jest.fn(), update: jest.fn() },
  User: { findByPk: jest.fn() },
  SocialParticipation: { findOne: jest.fn() },
  SocialReport: { create: jest.fn(), findOne: jest.fn() },
  sequelize: { fn: jest.fn(), col: jest.fn() },
}));
jest.mock('../src/social/trust.service', () => ({
  calculateTrustScore: jest.fn().mockResolvedValue({}),
}));

const { Review, SocialReport } = require('../src/data/models');

const USER_ID = 'user-1';
const REVIEW_ID = 'rev-1';

describe('Reviews Service — reportReview', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-REV-R1: creates the report and increments reportedCount on success', async () => {
    const increment = jest.fn().mockResolvedValue(true);
    Review.findByPk.mockResolvedValue({ id: REVIEW_ID, increment });
    SocialReport.create.mockResolvedValue({ id: 'sr-1', targetType: 'REVIEW', targetId: REVIEW_ID });

    const result = await reviewsService.reportReview(USER_ID, REVIEW_ID, { reason: 'SPAM' });

    expect(SocialReport.create).toHaveBeenCalledWith(expect.objectContaining({
      reporterId: USER_ID, targetType: 'REVIEW', targetId: REVIEW_ID, reason: 'SPAM',
    }));
    expect(increment).toHaveBeenCalledWith('reportedCount', { by: 1 });
    expect(result.id).toBe('sr-1');
  });

  test('TC-REV-R2: duplicate report → 409 and reportedCount NOT incremented', async () => {
    const increment = jest.fn().mockResolvedValue(true);
    Review.findByPk.mockResolvedValue({ id: REVIEW_ID, increment });
    const err = new Error('unique constraint');
    err.name = 'SequelizeUniqueConstraintError';
    SocialReport.create.mockRejectedValue(err);

    await expect(reviewsService.reportReview(USER_ID, REVIEW_ID, { reason: 'SPAM' }))
      .rejects.toMatchObject({ status: 409, code: 'ALREADY_REPORTED' });
    expect(increment).not.toHaveBeenCalled();
  });

  test('TC-REV-R3: report on non-existent review → 404', async () => {
    Review.findByPk.mockResolvedValue(null);
    await expect(reviewsService.reportReview(USER_ID, REVIEW_ID, { reason: 'SPAM' }))
      .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(SocialReport.create).not.toHaveBeenCalled();
  });
});
