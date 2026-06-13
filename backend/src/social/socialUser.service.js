const { User, Activity, Event, SocialParticipation, EventParticipation, SavedItem, Review, POI, UserSettings, sequelize } = require('../data/models');
const { Op } = require('sequelize');
const { calculateTrustScore } = require('./trust.service');

function displayName(user) {
  return user.nomeEnte || [user.nome, user.cognome].filter(Boolean).join(' ') || user.email;
}

function initials(user) {
  const source = displayName(user) || 'Utente';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'UT';
}

async function getUserTrustBreakdown(userId) {
  const breakdown = await calculateTrustScore(userId);
  return breakdown;
}

async function getMyProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  return {
    id: user.id,
    name: displayName(user),
    avatarUrl: user.avatarUrl || null,
    initials: initials(user),
    email: user.email,
    role: user.ruolo,
  };
}

function statusFilter(status) {
  if (!status) return null;
  const normalized = String(status).toLowerCase();
  const legacy = {
    active: 'attiva',
    published: 'attiva',
    completed: 'conclusa',
    cancelled: 'cancellata',
    draft: 'DRAFT',
    under_review: 'REPORTED',
  };
  const modern = {
    draft: 'DRAFT',
    published: 'PUBLISHED',
    active: 'ACTIVE',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
    under_review: 'REPORTED',
  };
  return {
    [Op.or]: [
      { status: modern[normalized] || normalized.toUpperCase() },
      { stato: legacy[normalized] || normalized },
    ],
  };
}

function clientStatus(activity) {
  const raw = activity.status || activity.stato || 'ACTIVE';
  const map = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REPORTED: 'under_review',
    REMOVED: 'cancelled',
    attiva: 'active',
    conclusa: 'completed',
    cancellata: 'cancelled',
  };
  return map[raw] || String(raw).toLowerCase();
}

async function getMyActivities(userId, { status, page = 1, limit = 10 } = {}) {
  const where = {
    [Op.and]: [
      { [Op.or]: [{ creatorId: userId }, { authorId: userId }] },
    ],
  };
  const filter = statusFilter(status);
  if (filter) where[Op.and].push(filter);

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const { rows, count } = await Activity.findAndCountAll({
    where,
    include: [{ model: User, as: 'participants', attributes: ['id'], through: { attributes: [] } }],
    distinct: true,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [['updatedAt', 'DESC']],
  });

  return {
    items: rows.map((activity) => {
      const participantCount = Number.isFinite(activity.participantsCount)
        ? activity.participantsCount
        : (Array.isArray(activity.participants) ? activity.participants.length : 0);
      return {
        id: activity.id,
        title: activity.title || `Attivita di ${activity.tipo || 'community'}`,
        status: clientStatus(activity),
        participantsCount: participantCount,
        capacity: activity.capacity || activity.maxPartecipanti || null,
        averageRating: activity.averageRating || 0,
        reviewCount: activity.reviewCount || 0,
        verifiedActivity: !!activity.verifiedActivity,
        lastUpdatedAt: activity.updatedAt,
      };
    }),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
    },
  };
}

async function manualRecalculateTrust(userId) {
  return calculateTrustScore(userId);
}

async function verifyAuthor(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  await user.update({ verifiedProfile: true });
  return calculateTrustScore(userId);
}

async function suspendAuthor(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  await user.update({ isSuspended: true });
  return calculateTrustScore(userId);
}

async function getMyParticipations(userId) {
  // Social participations (activities joined via social API, events via social join)
  const socialParts = await SocialParticipation.findAll({
    where: { userId, status: { [Op.in]: ['JOINED', 'WAITLISTED', 'ATTENDED'] } },
    order: [['joinedAt', 'DESC']]
  });

  // Classic event participations (events joined via /api/events/:id/participate)
  const eventParts = await EventParticipation.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']]
  });

  // Collect event IDs already covered by SocialParticipation to avoid duplicates
  const socialEventIds = new Set(
    socialParts.filter(p => p.targetType === 'EVENT').map(p => p.targetId)
  );

  const resolvedSocial = await Promise.all(socialParts.map(async (part) => {
    const item = part.toJSON();
    if (part.targetType === 'EVENT') {
      const event = await Event.findByPk(part.targetId);
      item.target = event ? event.toJSON() : null;
    } else {
      const activity = await Activity.findByPk(part.targetId);
      item.target = activity ? activity.toJSON() : null;
    }
    return item;
  }));

  const resolvedEvents = await Promise.all(
    eventParts
      .filter(ep => !socialEventIds.has(ep.eventId))
      .map(async (ep) => {
        const event = await Event.findByPk(ep.eventId);
        return {
          id: ep.id,
          userId: ep.userId,
          targetType: 'EVENT',
          targetId: ep.eventId,
          status: 'JOINED',
          joinedAt: ep.createdAt,
          createdAt: ep.createdAt,
          target: event ? event.toJSON() : null,
        };
      })
  );

  return [...resolvedSocial, ...resolvedEvents];
}

async function confirmAttendance(userId, participationId, userRole) {
  const part = await SocialParticipation.findByPk(participationId);
  if (!part) throw { status: 404, code: 'NOT_FOUND', error: 'Participation not found' };

  // Permission check: Organizer of the target event/activity, or staff
  let isAuthorized = false;
  if (userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN') {
    isAuthorized = true;
  } else {
    if (part.targetType === 'EVENT') {
      const event = await Event.findByPk(part.targetId);
      if (event && (event.organizerId === userId || event.entityId === userId)) {
        isAuthorized = true;
      }
    } else {
      const activity = await Activity.findByPk(part.targetId);
      if (activity && (activity.authorId === userId || activity.creatorId === userId)) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only event organizers or moderators can confirm attendance' };
  }

  await part.update({
    status: 'ATTENDED',
    attendedConfirmedAt: new Date()
  });

  // Increment completedActivitiesCount for participant if it's an activity
  if (part.targetType === 'ACTIVITY') {
    const participant = await User.findByPk(part.userId);
    if (participant) {
      await participant.increment('completedActivitiesCount', { by: 1 }).catch(() => {});
      await calculateTrustScore(part.userId).catch(() => {});
    }
  }

  return part;
}

async function markNoShow(userId, participationId, userRole) {
  const part = await SocialParticipation.findByPk(participationId);
  if (!part) throw { status: 404, code: 'NOT_FOUND', error: 'Participation not found' };

  let isAuthorized = false;
  if (userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN') {
    isAuthorized = true;
  } else {
    if (part.targetType === 'EVENT') {
      const event = await Event.findByPk(part.targetId);
      if (event && (event.organizerId === userId || event.entityId === userId)) {
        isAuthorized = true;
      }
    } else {
      const activity = await Activity.findByPk(part.targetId);
      if (activity && (activity.authorId === userId || activity.creatorId === userId)) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Only event organizers or moderators can mark no-show' };
  }

  await part.update({
    status: 'NO_SHOW'
  });

  // Calculate penalties if necessary
  await calculateTrustScore(part.userId).catch(() => {});

  return part;
}

async function getParticipantsList(targetType, targetId, requesterId = null, requesterRole = null) {
  const participations = await SocialParticipation.findAll({
    where: { targetType, targetId, status: { [Op.in]: ['JOINED', 'WAITLISTED', 'ATTENDED'] } },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'verifiedProfile'],
      include: [{ model: UserSettings, as: 'settings' }]
    }]
  });

  // Get the organizer of the target
  let organizerId = null;
  if (targetType === 'EVENT') {
    const event = await Event.findByPk(targetId);
    organizerId = event ? (event.organizerId || event.entityId) : null;
  } else {
    const activity = await Activity.findByPk(targetId);
    organizerId = activity ? (activity.authorId || activity.creatorId) : null;
  }

  const isRequesterAdminOrMod = requesterRole && ['ADMIN', 'MODERATOR', 'AmministratoreComunale', 'AmministratoreDiSistema'].includes(requesterRole);
  const isRequesterOrganizer = requesterId && organizerId && requesterId === organizerId;

  return participations.map(p => {
    if (!p.user) return { participationId: p.id, userId: p.userId, status: p.status, joinedAt: p.joinedAt, user: null };

    const settings = p.user.settings; // may be null
    const showProfile = settings ? settings.showProfileInParticipants : true;
    const visibility = settings ? settings.participationVisibility : 'public';

    // Check if the requester is allowed to see the profile details
    let isAllowed = true;
    if (requesterId && requesterId === p.userId) {
      isAllowed = true;
    } else if (isRequesterAdminOrMod) {
      isAllowed = true;
    } else {
      if (!showProfile || visibility === 'private') {
        isAllowed = false;
      } else if (visibility === 'organizers_only') {
        isAllowed = isRequesterOrganizer;
      }
    }

    const isAnonymized = !isAllowed;

    return {
      participationId: p.id,
      userId: isAnonymized ? null : p.user.id,
      status: p.status,
      joinedAt: p.joinedAt,
      user: isAnonymized ? {
        id: null,
        name: "Partecipante privato",
        avatarUrl: null,
        isPrivate: true
      } : {
        id: p.user.id,
        name: `${p.user.nome} ${p.user.cognome}`.trim(),
        avatarUrl: p.user.avatarUrl,
        authorTrustLevel: p.user.authorTrustLevel,
        verifiedProfile: p.user.verifiedProfile
      }
    };
  });
}

async function getMySavedItems(userId) {
  const saved = await SavedItem.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']]
  });

  const resolved = await Promise.all(saved.map(async (item) => {
    const res = item.toJSON();
    if (item.targetType === 'EVENT') {
      const event = await Event.findByPk(item.targetId);
      res.details = event;
    } else {
      const activity = await Activity.findByPk(item.targetId);
      res.details = activity;
    }
    return res;
  }));

  return resolved;
}

async function getMyUpcomingItems(userId) {
  const participations = await SocialParticipation.findAll({
    where: { userId, status: 'JOINED' }
  });

  const saved = await SavedItem.findAll({
    where: { userId }
  });

  const targetIds = [
    ...participations.map(p => p.targetId),
    ...saved.map(s => s.targetId)
  ];

  const now = new Date();

  const events = await Event.findAll({
    where: {
      id: { [Op.in]: targetIds },
      startDateTime: { [Op.gt]: now },
      status: 'PUBLISHED'
    },
    limit: 5,
    order: [['startDateTime', 'ASC']]
  });

  const activities = await Activity.findAll({
    where: {
      id: { [Op.in]: targetIds },
      status: 'ACTIVE'
    },
    limit: 5,
    order: [['createdAt', 'DESC']]
  });

  return {
    events,
    activities
  };
}

async function getPersonalizedRecommendations(userId) {
  const settings = await UserSettings.findOne({ where: { userId } });
  const user = await User.findByPk(userId);
  const userInterests = settings?.interestsJson || user?.interessi || [];
  const interestsUpper = userInterests.map(i => i.toUpperCase());

  const now = new Date();
  
  // Recommend events
  const eventWhere = {
    status: 'PUBLISHED',
    startDateTime: { [Op.gt]: now }
  };
  if (interestsUpper.length > 0) {
    eventWhere.category = { [Op.in]: interestsUpper };
  }
  
  const eventInclude = [];
  if (settings?.showOnlyReliableActivities) {
    eventInclude.push({
      model: User,
      as: 'entity',
      where: {
        authorTrustLevel: { [Op.in]: ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'] }
      },
      attributes: []
    });
  }

  const events = await Event.findAll({
    where: eventWhere,
    include: eventInclude,
    limit: 3,
    order: [['startDateTime', 'ASC']]
  });

  // Recommend activities
  const activityWhere = {
    status: 'ACTIVE'
  };
  if (interestsUpper.length > 0) {
    activityWhere.category = { [Op.in]: interestsUpper };
  }
  if (settings?.showVerifiedActivities) {
    activityWhere.verifiedActivity = true;
  }

  const activityInclude = [];
  if (settings?.showOnlyReliableActivities) {
    activityInclude.push({
      model: User,
      as: 'creator',
      where: {
        authorTrustLevel: { [Op.in]: ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'] }
      },
      attributes: []
    });
  }

  const activities = await Activity.findAll({
    where: activityWhere,
    include: activityInclude,
    limit: 3,
    order: [['averageRating', 'DESC']]
  });

  return {
    events,
    activities
  };
}

module.exports = {
  getUserTrustBreakdown,
  getMyProfile,
  getMyActivities,
  manualRecalculateTrust,
  verifyAuthor,
  suspendAuthor,
  getMyParticipations,
  confirmAttendance,
  markNoShow,
  getParticipantsList,
  getMySavedItems,
  getMyUpcomingItems,
  getPersonalizedRecommendations,
};
