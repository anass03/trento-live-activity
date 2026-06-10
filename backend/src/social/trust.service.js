const { User, Activity, Review, SocialReport, sequelize } = require('../data/models');
const { Op } = require('sequelize');

async function calculateTrustScore(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  // 1. Completed & Published Activities Counts
  const completedActivitiesCount = await Activity.count({
    where: { creatorId: userId, status: 'COMPLETED' }
  });

  const publishedActivitiesCount = await Activity.count({
    where: { creatorId: userId, status: { [Op.in]: ['ACTIVE', 'COMPLETED', 'CANCELLED'] } }
  });

  const cancelledActivitiesCount = await Activity.count({
    where: { creatorId: userId, status: 'CANCELLED' }
  });

  // Calculate cancellation rate
  const cancellationRate = publishedActivitiesCount > 0
    ? (cancelledActivitiesCount / publishedActivitiesCount)
    : 0.0;

  // 2. Average Ratings from reviews (overall, accuracy, organization, safety, atmosphere)
  const reviewsStats = await Review.findOne({
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

  const reviewCount = parseInt(reviewsStats?.count || 0, 10);
  const averageAuthorRating = reviewCount > 0 ? parseFloat(reviewsStats.avgOverall) : 0.0;
  const avgAccuracy = reviewCount > 0 ? parseFloat(reviewsStats.avgAccuracy) : 0.0;
  const avgOrg = reviewCount > 0 ? parseFloat(reviewsStats.avgOrg) : 0.0;
  const avgSafety = reviewCount > 0 ? parseFloat(reviewsStats.avgSafety) : 0.0;
  const avgAtmosphere = reviewCount > 0 ? parseFloat(reviewsStats.avgAtmosphere) : 0.0;

  // 3. Abuse reports count in last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const reportsCountLast90Days = await SocialReport.count({
    where: {
      targetType: 'USER',
      targetId: userId,
      status: { [Op.ne]: 'DISMISSED' },
      createdAt: { [Op.gte]: ninetyDaysAgo }
    }
  });

  // 4. Formula implementation
  // Base Score: 40
  let score = 40;
  const explanation = [];

  explanation.push('Base author score: +40');

  // Verified profile bonus: +10
  if (user.verifiedProfile) {
    score += 10;
    explanation.push('Verified profile bonus: +10');
  }

  // Admin/Partner manual verification bonus: +20
  if (user.role === 'ADMIN' || user.role === 'PARTNER') {
    score += 20;
    explanation.push('Partner/Admin credential bonus: +20');
  }

  // Completed activities bonus: +2 per activity (up to 15)
  const completedBonus = Math.min(completedActivitiesCount * 2, 15);
  if (completedBonus > 0) {
    score += completedBonus;
    explanation.push(`Completed activities bonus (${completedActivitiesCount} completed): +${completedBonus}`);
  }

  // Review bonuses: relative to 3.0 stars baseline
  if (reviewCount > 0) {
    // Overall rating bonus (up to 15 points)
    const ratingBonus = Math.max(-15, Math.min(15, (averageAuthorRating - 3.0) * 7.5));
    score += ratingBonus;
    explanation.push(`Average rating bonus (${averageAuthorRating.toFixed(1)} stars): ${ratingBonus >= 0 ? '+' : ''}${ratingBonus.toFixed(1)}`);

    // Category ratings (accuracy, organization, safety) up to 5 points each
    const accuracyBonus = Math.max(-5, Math.min(5, (avgAccuracy - 3.0) * 2.5));
    score += accuracyBonus;
    explanation.push(`Accuracy rating bonus (${avgAccuracy.toFixed(1)} stars): ${accuracyBonus >= 0 ? '+' : ''}${accuracyBonus.toFixed(1)}`);

    const orgBonus = Math.max(-5, Math.min(5, (avgOrg - 3.0) * 2.5));
    score += orgBonus;
    explanation.push(`Organization rating bonus (${avgOrg.toFixed(1)} stars): ${orgBonus >= 0 ? '+' : ''}${orgBonus.toFixed(1)}`);

    const safetyBonus = Math.max(-5, Math.min(5, (avgSafety - 3.0) * 2.5));
    score += safetyBonus;
    explanation.push(`Safety rating bonus (${avgSafety.toFixed(1)} stars): ${safetyBonus >= 0 ? '+' : ''}${safetyBonus.toFixed(1)}`);
  }

  // Penalties
  // Cancellation penalty: up to -30 points
  const cancellationPenalty = Math.min(30, cancellationRate * 30);
  if (cancellationPenalty > 0) {
    score -= cancellationPenalty;
    explanation.push(`Cancellation rate penalty (${(cancellationRate * 100).toFixed(0)}% cancelled): -${cancellationPenalty.toFixed(1)}`);
  }

  // Report penalty: -5 per non-dismissed report (up to -30)
  const reportPenalty = Math.min(30, reportsCountLast90Days * 5);
  if (reportPenalty > 0) {
    score -= reportPenalty;
    explanation.push(`Recent report abuse penalty (${reportsCountLast90Days} reports): -${reportPenalty}`);
  }

  // Suspension penalty: -50
  if (user.isSuspended) {
    score -= 50;
    explanation.push('Account suspension penalty: -50');
  }

  // Clamp score
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Trust Level assignment
  let trustLevel = 'NEW';
  if (user.role === 'ADMIN' || user.role === 'PARTNER') {
    trustLevel = 'VERIFIED';
  } else if (completedActivitiesCount >= 3) {
    if (finalScore >= 92) trustLevel = 'VERIFIED';
    else if (finalScore >= 80) trustLevel = 'HIGHLY_RELIABLE';
    else if (finalScore >= 65) trustLevel = 'RELIABLE';
    else if (finalScore >= 50) trustLevel = 'GROWING';
  }

  // Save recalculated fields to the database
  await user.update({
    authorTrustScore: finalScore,
    authorTrustLevel: trustLevel,
    completedActivitiesCount,
    publishedActivitiesCount,
    averageAuthorRating,
    reportsCountLast90Days,
    cancellationRate,
  });

  return {
    userId,
    userName: `${user.nome} ${user.cognome}`,
    authorTrustScore: finalScore,
    authorTrustLevel: trustLevel,
    reviewCount,
    completedActivitiesCount,
    cancellationRate,
    reportsCountLast90Days,
    explanation,
  };
}

module.exports = { calculateTrustScore };
