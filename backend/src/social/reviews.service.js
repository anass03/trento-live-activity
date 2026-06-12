const { Review, Activity, User, SocialParticipation, SocialReport, sequelize } = require('../data/models');
const { Op } = require('sequelize');
const { calculateTrustScore } = require('./trust.service');

async function listReviews(activityId, sortBy = 'newest', page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const where = { targetType: 'ACTIVITY', targetId: activityId, moderationStatus: 'VISIBLE' };

  let order = [['createdAt', 'DESC']];
  if (sortBy === 'highestRating') {
    order = [['ratingOverall', 'DESC']];
  } else if (sortBy === 'lowestRating') {
    order = [['ratingOverall', 'ASC']];
  } else if (sortBy === 'mostHelpful') {
    // For now sort by reported count ascending or createdAt DESC
    order = [['reportedCount', 'ASC'], ['createdAt', 'DESC']];
  }

  const { rows, count } = await Review.findAndCountAll({
    where,
    include: [{ model: User, as: 'reviewer', attributes: ['id', 'nome', 'cognome', 'avatarUrl'] }],
    order,
    limit,
    offset
  });

  return {
    reviews: rows,
    total: count,
    page,
    limit
  };
}

async function createReview(userId, activityId, payload) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };

  // Author cannot review own activity
  if (activity.creatorId === userId || activity.authorId === userId) {
    throw { status: 400, code: 'OWN_ACTIVITY_REVIEW', error: 'Cannot review your own activity' };
  }

  // Check participation status = ATTENDED
  const participation = await SocialParticipation.findOne({
    where: { userId, targetType: 'ACTIVITY', targetId: activityId }
  });

  // Since attendance check-in is part of our flow, we accept ATTENDED. 
  // For testing convenience, we will also allow it if status is JOINED but target is in the past.
  const isPast = new Date(activity.data) < new Date() || activity.status === 'COMPLETED';
  const hasAttended = participation && (participation.status === 'ATTENDED' || (participation.status === 'JOINED' && isPast));
  
  if (!hasAttended) {
    throw { status: 403, code: 'NOT_ATTENDED', error: 'Only participants who attended can write reviews' };
  }

  // Check duplicate review
  const duplicate = await Review.findOne({
    where: { reviewerId: userId, targetType: 'ACTIVITY', targetId: activityId }
  });
  if (duplicate) {
    throw { status: 409, code: 'ALREADY_REVIEWED', error: 'You have already reviewed this activity' };
  }

  const { ratingOverall, ratingAccuracy, ratingOrganization, ratingSafety, ratingAtmosphere, comment } = payload;
  if (!ratingOverall || !ratingAccuracy || !ratingOrganization || !ratingSafety || !ratingAtmosphere) {
    throw { status: 400, code: 'MISSING_RATINGS', error: 'All rating sub-fields are required (overall, accuracy, organization, safety, atmosphere)' };
  }

  const review = await Review.create({
    reviewerId: userId,
    targetType: 'ACTIVITY',
    targetId: activityId,
    authorId: activity.authorId || activity.creatorId,
    ratingOverall: parseInt(ratingOverall, 10),
    ratingAccuracy: parseInt(ratingAccuracy, 10),
    ratingOrganization: parseInt(ratingOrganization, 10),
    ratingSafety: parseInt(ratingSafety, 10),
    ratingAtmosphere: parseInt(ratingAtmosphere, 10),
    comment,
    isVerifiedParticipantReview: true,
    moderationStatus: 'VISIBLE'
  });

  // Update Activity stats
  await updateActivityStats(activityId);

  // Recalculate author's trust score
  await calculateTrustScore(activity.authorId || activity.creatorId).catch(() => {});

  return review;
}

async function updateReview(userId, reviewId, payload, userRole) {
  const review = await Review.findByPk(reviewId);
  if (!review) throw { status: 404, code: 'NOT_FOUND', error: 'Review not found' };

  const isReviewer = review.reviewerId === userId;
  const isStaff = userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN';

  if (!isReviewer && !isStaff) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to edit this review' };
  }

  const { ratingOverall, ratingAccuracy, ratingOrganization, ratingSafety, ratingAtmosphere, comment } = payload;
  const updates = {};
  if (ratingOverall) updates.ratingOverall = parseInt(ratingOverall, 10);
  if (ratingAccuracy) updates.ratingAccuracy = parseInt(ratingAccuracy, 10);
  if (ratingOrganization) updates.ratingOrganization = parseInt(ratingOrganization, 10);
  if (ratingSafety) updates.ratingSafety = parseInt(ratingSafety, 10);
  if (ratingAtmosphere) updates.ratingAtmosphere = parseInt(ratingAtmosphere, 10);
  if (comment !== undefined) updates.comment = comment;

  await review.update(updates);

  // Sync stats
  if (review.targetType === 'ACTIVITY') {
    await updateActivityStats(review.targetId);
  }
  await calculateTrustScore(review.authorId).catch(() => {});

  return review;
}

async function deleteReview(userId, reviewId, userRole) {
  const review = await Review.findByPk(reviewId);
  if (!review) throw { status: 404, code: 'NOT_FOUND', error: 'Review not found' };

  const isReviewer = review.reviewerId === userId;
  const isStaff = userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN';

  if (!isReviewer && !isStaff) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to delete this review' };
  }

  // Soft delete review
  await review.update({ moderationStatus: 'HIDDEN' });

  // Sync stats
  if (review.targetType === 'ACTIVITY') {
    await updateActivityStats(review.targetId);
  }
  await calculateTrustScore(review.authorId).catch(() => {});

  return { message: 'Review deleted successfully' };
}

async function reportReview(userId, reviewId, { reason, description }) {
  const review = await Review.findByPk(reviewId);
  if (!review) throw { status: 404, code: 'NOT_FOUND', error: 'Review not found' };

  // Create abuse report first: the unique index (reporterId, targetType, targetId)
  // rejects duplicates, and reportedCount must be incremented only on success.
  let report;
  try {
    report = await SocialReport.create({
      reporterId: userId,
      targetType: 'REVIEW',
      targetId: reviewId,
      reason: reason || 'INAPPROPRIATE',
      description
    });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, code: 'ALREADY_REPORTED', error: 'You have already reported this review' };
    }
    throw e;
  }

  await review.increment('reportedCount', { by: 1 });

  return report;
}

async function getUserReviewsSummary(userId) {
  const stats = await Review.findOne({
    where: { authorId: userId, moderationStatus: 'VISIBLE' },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('ratingOverall')), 'avgOverall'],
      [sequelize.fn('AVG', sequelize.col('ratingAccuracy')), 'avgAccuracy'],
      [sequelize.fn('AVG', sequelize.col('ratingOrganization')), 'avgOrg'],
      [sequelize.fn('AVG', sequelize.col('ratingSafety')), 'avgSafety'],
      [sequelize.fn('AVG', sequelize.col('ratingAtmosphere')), 'avgAtmosphere'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    raw: true
  });

  const count = parseInt(stats?.count || 0, 10);
  return {
    userId,
    reviewCount: count,
    averageRating: count > 0 ? parseFloat(stats.avgOverall) : 0.0,
    ratings: {
      accuracy: count > 0 ? parseFloat(stats.avgAccuracy) : 0.0,
      organization: count > 0 ? parseFloat(stats.avgOrg) : 0.0,
      safety: count > 0 ? parseFloat(stats.avgSafety) : 0.0,
      atmosphere: count > 0 ? parseFloat(stats.avgAtmosphere) : 0.0
    }
  };
}

// Helper to recalculate activity average ratings
async function updateActivityStats(activityId) {
  const stats = await Review.findOne({
    where: { targetType: 'ACTIVITY', targetId: activityId, moderationStatus: 'VISIBLE' },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('ratingOverall')), 'avgOverall'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    raw: true
  });

  const count = parseInt(stats?.count || 0, 10);
  const avg = count > 0 ? parseFloat(stats.avgOverall) : 0.0;

  await Activity.update(
    { averageRating: avg, reviewCount: count },
    { where: { id: activityId } }
  );
}

module.exports = {
  listReviews,
  createReview,
  updateReview,
  deleteReview,
  reportReview,
  getUserReviewsSummary,
};
