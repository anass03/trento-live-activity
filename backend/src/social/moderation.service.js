const { SocialReport, User, Event, Activity, Comment, Review } = require('../data/models');
const { Op } = require('sequelize');

async function createSocialReport(userId, { targetType, targetId, reason, description }) {
  if (!targetType || !targetId || !reason) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'targetType, targetId, and reason are required' };
  }

  // Validate target existence
  let targetExists = false;
  if (targetType === 'USER') {
    targetExists = await User.findByPk(targetId);
  } else if (targetType === 'EVENT') {
    targetExists = await Event.findByPk(targetId);
  } else if (targetType === 'ACTIVITY') {
    targetExists = await Activity.findByPk(targetId);
  } else if (targetType === 'COMMENT') {
    targetExists = await Comment.findByPk(targetId);
  } else if (targetType === 'REVIEW') {
    targetExists = await Review.findByPk(targetId);
  }

  if (!targetExists) {
    throw { status: 404, code: 'TARGET_NOT_FOUND', error: `Flagged target of type ${targetType} not found` };
  }

  // Check duplicate report
  const duplicate = await SocialReport.findOne({
    where: { reporterId: userId, targetType, targetId }
  });
  if (duplicate) {
    throw { status: 409, code: 'ALREADY_REPORTED', error: 'You have already reported this item' };
  }

  const report = await SocialReport.create({
    reporterId: userId,
    targetType,
    targetId,
    reason,
    description,
    status: 'OPEN'
  });

  return report;
}

async function listAdminReports(query) {
  const { status, targetType, page = 1, limit = 20 } = query;
  const where = {};
  if (status) where.status = status;
  if (targetType) where.targetType = targetType;

  const offset = (page - 1) * limit;
  const { rows, count } = await SocialReport.findAndCountAll({
    where,
    include: [{ model: User, as: 'reporter', attributes: ['id', 'nome', 'cognome'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  return {
    reports: rows,
    total: count,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
}

async function resolveReport(reportId, { action }) {
  const report = await SocialReport.findByPk(reportId);
  if (!report) throw { status: 404, code: 'NOT_FOUND', error: 'Report not found' };

  if (action === 'DISMISS') {
    await report.update({ status: 'DISMISSED' });
  } else if (action === 'RESOLVE') {
    await report.update({ status: 'ACTION_TAKEN' });
  } else {
    throw { status: 400, code: 'INVALID_ACTION', error: 'Action must be DISMISS or RESOLVE' };
  }

  return report;
}

async function applyModerationAction(action, { targetType, targetId }) {
  if (!targetType || !targetId) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'targetType and targetId are required' };
  }

  let success = false;
  if (targetType === 'COMMENT') {
    const comment = await Comment.findByPk(targetId);
    if (!comment) throw { status: 404, code: 'NOT_FOUND', error: 'Comment not found' };
    
    if (action === 'HIDE' || action === 'REMOVE') {
      await comment.update({ moderationStatus: 'HIDDEN' });
    } else if (action === 'RESTORE') {
      await comment.update({ moderationStatus: 'VISIBLE' });
    }
    success = true;
  } else if (targetType === 'REVIEW') {
    const review = await Review.findByPk(targetId);
    if (!review) throw { status: 404, code: 'NOT_FOUND', error: 'Review not found' };

    if (action === 'HIDE' || action === 'REMOVE') {
      await review.update({ moderationStatus: 'HIDDEN' });
    } else if (action === 'RESTORE') {
      await review.update({ moderationStatus: 'VISIBLE' });
    }
    success = true;
  } else if (targetType === 'EVENT') {
    const event = await Event.findByPk(targetId);
    if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

    if (action === 'HIDE') {
      await event.update({ status: 'DRAFT' });
    } else if (action === 'REMOVE') {
      await event.update({ status: 'CANCELLED' });
    } else if (action === 'RESTORE') {
      await event.update({ status: 'PUBLISHED' });
    }
    success = true;
  } else if (targetType === 'ACTIVITY') {
    const activity = await Activity.findByPk(targetId);
    if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };

    if (action === 'HIDE') {
      await activity.update({ status: 'DRAFT' });
    } else if (action === 'REMOVE') {
      await activity.update({ status: 'REMOVED' });
    } else if (action === 'RESTORE') {
      await activity.update({ status: 'ACTIVE' });
    }
    success = true;
  }

  return { success, action, targetType, targetId };
}

module.exports = {
  createSocialReport,
  listAdminReports,
  resolveReport,
  applyModerationAction,
};
