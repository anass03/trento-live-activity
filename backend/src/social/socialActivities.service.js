const { Activity, User, Reaction, SavedItem, SocialParticipation, Review, POI, UserSettings, sequelize } = require('../data/models');
const { Op } = require('sequelize');
const { broadcastActivityUpdate } = require('./sse');

// Haversine distance helper
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simulates weather service to check suitability
function isSuitableWeather(category, difficulty) {
  // Let's assume current mock weather is "pioggia" (rainy) or "buono" (sunny)
  // Rainy weather makes OUTDOOR activities less suitable
  const mockCurrentWeather = 'sunny'; 
  if (mockCurrentWeather === 'rainy' && category === 'OUTDOOR') {
    return false;
  }
  if (difficulty === 'HARD' && mockCurrentWeather === 'rainy') {
    return false;
  }
  return true;
}

async function serializeActivitySocial(activity, currentUserId = null) {
  const item = activity.toJSON ? activity.toJSON() : { ...activity };
  
  // Author details
  const author = item.creator || item.author || null;
  item.author = author ? {
    id: author.id,
    name: `${author.nome} ${author.cognome}`.trim(),
    avatarUrl: author.avatarUrl || null,
    authorTrustLevel: author.authorTrustLevel || 'NEW',
    authorTrustScore: author.authorTrustScore != null ? author.authorTrustScore : 40,
    verifiedProfile: !!author.verifiedProfile,
  } : null;

  // Defaults
  item.imageUrls = item.imageUrls || [];
  item.tags = item.tags || [];
  item.participantsCount = item.participantsCount || 0;
  item.averageRating = item.averageRating || 0.0;
  item.reviewCount = item.reviewCount || 0;
  item.verifiedActivity = !!item.verifiedActivity;
  item.suitableNow = isSuitableWeather(item.category, item.difficulty);
  item.risingScore = item.risingScore || 0.0;
  item.trustRequired = !!item.trustRequired;

  // Map to target shape properties for frontends
  item.title = item.title || item.titolo;
  item.description = item.description || item.descrizione || '';
  item.category = item.category || (item.tipo ? item.tipo.toUpperCase() : 'OTHER');
  item.address = item.address || item.indirizzo;
  item.capacity = item.capacity || item.maxPartecipanti;

  // Legacy mappings
  item.tipo = item.category.toLowerCase();
  item.stato = item.status === 'ACTIVE' ? 'attiva' : (item.status === 'CANCELLED' ? 'cancellata' : 'conclusa');
  item.indirizzo = item.address;
  item.creatorId = item.authorId;
  item.maxPartecipanti = item.capacity;
  item.latitudine = item.latitude;
  item.longitudine = item.longitude;

  // Fetch participant ids
  const participations = await SocialParticipation.findAll({
    where: { targetType: 'ACTIVITY', targetId: item.id, status: 'JOINED' },
    attributes: ['userId']
  });
  item.participantIds = participations.map(p => p.userId);
  item.participantCount = item.participantsCount;

  // Creator legacy details
  item.creator = author ? {
    id: author.id,
    name: [author.nome, author.cognome].filter(Boolean).join(' ')
  } : null;

  // User flags
  if (currentUserId) {
    const [saved, joined] = await Promise.all([
      SavedItem.findOne({ where: { userId: currentUserId, targetType: 'ACTIVITY', targetId: item.id } }),
      SocialParticipation.findOne({ where: { userId: currentUserId, targetType: 'ACTIVITY', targetId: item.id, status: 'JOINED' } }),
    ]);
    item.savedByMe = !!saved;
    item.joinedByMe = !!joined;
  } else {
    item.savedByMe = false;
    item.joinedByMe = false;
  }

  return item;
}

async function listActivities(currentUserId, query) {
  const {
    category,
    difficulty,
    durationMin,
    durationMax,
    priceType,
    nearby,
    suitableNow,
    verifiedOnly,
    highTrustOnly,
    authorId,
    search,
    sortBy = 'relevance',
    page = 1,
    limit = 10,
    lat,
    lng,
  } = query;

  const settings = currentUserId ? await UserSettings.findOne({ where: { userId: currentUserId } }) : null;
  const where = {};

  // Status constraint (must be ACTIVE or PUBLISHED)
  where.status = { [Op.in]: ['ACTIVE', 'PUBLISHED', 'COMPLETED'] };

  if (category) where.category = category;
  if (difficulty) where.difficulty = difficulty;
  if (priceType) where.priceType = priceType;
  if (authorId) where.authorId = authorId;

  if (durationMin || durationMax) {
    where.durationMinutes = {};
    if (durationMin) where.durationMinutes[Op.gte] = parseInt(durationMin, 10);
    if (durationMax) where.durationMinutes[Op.lte] = parseInt(durationMax, 10);
  }

  if (settings?.showVerifiedActivities || verifiedOnly === 'true') {
    where.verifiedActivity = true;
  }

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { locationName: { [Op.iLike]: `%${search}%` } },
    ];
  }

  let activities = await Activity.findAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'authorTrustScore', 'verifiedProfile'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] }
    ]
  });

  // Filters executed in memory
  if (highTrustOnly === 'true') {
    activities = activities.filter(a => (a.creator?.authorTrustScore || 0) >= 80);
  }

  if (settings?.showOnlyReliableActivities) {
    activities = activities.filter(a =>
      a.creator && ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'].includes(a.creator.authorTrustLevel)
    );
  }

  if (suitableNow === 'true') {
    activities = activities.filter(a => isSuitableWeather(a.category, a.difficulty));
  }

  if (nearby === 'true' && lat && lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    activities = activities.filter(a => {
      if (a.latitudine && a.longitudine) {
        const dist = getDistance(latitude, longitude, a.latitudine, a.longitudine);
        a.distance = dist;
        return dist <= 10; // 10 km limit
      }
      return false;
    });
  }

  // Sorting
  if (sortBy === 'rating') {
    activities.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
  } else if (sortBy === 'duration') {
    activities.sort((a, b) => (a.durationMinutes || 0) - (b.durationMinutes || 0));
  } else if (sortBy === 'authorTrust') {
    activities.sort((a, b) => (b.creator?.authorTrustScore || 0) - (a.creator?.authorTrustScore || 0));
  } else if (sortBy === 'participants') {
    activities.sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0));
  } else if (sortBy === 'rising') {
    activities.sort((a, b) => (b.risingScore || 0) - (a.risingScore || 0));
  } else if (sortBy === 'relevance') {
    // Verified activities first, then high trust, then higher rating
    const score = (a) => {
      let s = 0;
      if (a.verifiedActivity) s += 1000;
      s += (a.creator?.authorTrustScore || 0) * 5;
      s += (a.averageRating || 0) * 10;
      if (a.distance) s += Math.max(0, 100 - a.distance * 10);
      return s;
    };
    activities.sort((a, b) => score(b) - score(a));
  } else {
    // newest
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Pagination
  const total = activities.length;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const offset = (p - 1) * l;
  const paginated = activities.slice(offset, offset + l);

  const serialized = await Promise.all(
    paginated.map(a => serializeActivitySocial(a, currentUserId))
  );

  return {
    activities: serialized,
    total,
    page: p,
    limit: l
  };
}

async function getActivitySocial(currentUserId, activityId) {
  const activity = await Activity.findByPk(activityId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'authorTrustScore', 'verifiedProfile'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] }
    ]
  });
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };

  const serialized = await serializeActivitySocial(activity, currentUserId);

  // Similar activities (same category)
  const similar = await Activity.findAll({
    where: { category: activity.category, id: { [Op.ne]: activityId }, status: 'ACTIVE' },
    limit: 3
  });
  serialized.similarActivities = await Promise.all(similar.map(s => serializeActivitySocial(s, currentUserId)));

  return serialized;
}

async function createActivitySocial(userId, payload) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  const { title, description, category, tags, locationName, address, latitude, longitude, durationMinutes, difficulty, priceType, priceLabel, capacity, imageUrls } = payload;
  if (!title || !category || !durationMinutes || !difficulty) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'title, category, durationMinutes, and difficulty are required' };
  }

  // Low trust users require moderation
  const isLowTrust = (user.authorTrustScore || 40) < 50;
  const status = isLowTrust ? 'DRAFT' : 'ACTIVE';

  const activity = await Activity.create({
    title,
    description,
    category,
    tags: tags || [],
    locationName,
    address,
    latitudine: latitude,
    longitudine: longitude,
    durationMinutes: parseInt(durationMinutes, 10),
    difficulty,
    priceType: priceType || 'FREE',
    priceLabel,
    authorId: userId,
    capacity: capacity || null,
    imageUrls: imageUrls || [],
    status,
    // default fields mapped in model beforeSave
    data: new Date().toISOString().split('T')[0],
    orarioInizio: '00:00',
    orarioFine: '23:59',
  });

  await user.increment('publishedActivitiesCount', { by: 1 }).catch(() => {});

  broadcastActivityUpdate(activity.id, 'CREATE', { title, status });

  return serializeActivitySocial(activity, userId);
}

async function updateActivitySocial(userId, activityId, updates, userRole) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };

  const isAuthor = activity.authorId === userId || activity.creatorId === userId;
  const isStaff = userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN';

  if (!isAuthor && !isStaff) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to edit this activity' };
  }

  // Restrict edit if users joined
  if (activity.participantsCount > 0 && (updates.durationMinutes || updates.difficulty || updates.priceType)) {
    throw { status: 400, code: 'ACTIVITY_LOCKED', error: 'Cannot modify core activity parameters after users have joined' };
  }

  const ALLOWED = ['title', 'description', 'category', 'tags', 'locationName', 'address', 'latitude', 'longitude', 'durationMinutes', 'difficulty', 'priceType', 'priceLabel', 'capacity', 'imageUrls', 'status'];
  const filtered = {};
  ALLOWED.forEach(key => {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  });

  await activity.update(filtered);
  return serializeActivitySocial(activity, userId);
}

async function deleteActivitySocial(userId, activityId, userRole) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };

  const isAuthor = activity.authorId === userId || activity.creatorId === userId;
  const isStaff = userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN';

  if (!isAuthor && !isStaff) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to delete this activity' };
  }

  await activity.update({ status: 'CANCELLED' });

  // Update participations
  await SocialParticipation.update(
    { status: 'CANCELLED', cancelledAt: new Date() },
    { where: { targetType: 'ACTIVITY', targetId: activityId, status: 'JOINED' } }
  );

  broadcastActivityUpdate(activityId, 'CANCEL');
  return { message: 'Activity cancelled successfully' };
}

async function joinActivitySocial(userId, activityId) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };

  if (activity.status === 'CANCELLED') {
    throw { status: 400, code: 'ACTIVITY_CANCELLED', error: 'Cannot join a cancelled activity' };
  }

  // Check trust requirement
  if (activity.trustRequired) {
    const user = await User.findByPk(userId);
    if ((user?.authorTrustScore || 40) < 55) {
      throw { status: 403, code: 'TRUST_TOO_LOW', error: 'This activity requires a higher user trust score to join' };
    }
  }

  let status = 'JOINED';
  if (activity.capacity && activity.participantsCount >= activity.capacity) {
    status = 'WAITLISTED';
  }

  const [participation, created] = await SocialParticipation.findOrCreate({
    where: { userId, targetType: 'ACTIVITY', targetId: activityId },
    defaults: { status, joinedAt: new Date() }
  });

  if (!created) {
    if (participation.status === 'JOINED' || participation.status === 'WAITLISTED') {
      throw { status: 409, code: 'ALREADY_PARTICIPATING', error: 'Already registered for this activity' };
    }
    await participation.update({ status, joinedAt: new Date(), cancelledAt: null });
  }

  if (status === 'JOINED') {
    await activity.increment('participantsCount', { by: 1 });
  }

  const updated = await Activity.findByPk(activityId);
  broadcastActivityUpdate(activityId, 'JOIN', { participantsCount: updated.participantsCount });

  return {
    activityId,
    status,
    participantsCount: updated.participantsCount
  };
}

async function leaveActivitySocial(userId, activityId) {
  const participation = await SocialParticipation.findOne({
    where: { userId, targetType: 'ACTIVITY', targetId: activityId, status: { [Op.in]: ['JOINED', 'WAITLISTED'] } }
  });

  if (!participation) {
    throw { status: 404, code: 'NOT_PARTICIPATING', error: 'No active participation found' };
  }

  const previousStatus = participation.status;
  await participation.update({ status: 'CANCELLED', cancelledAt: new Date() });

  const activity = await Activity.findByPk(activityId);
  if (previousStatus === 'JOINED' && activity.participantsCount > 0) {
    await activity.decrement('participantsCount', { by: 1 });
  }

  const updated = await Activity.findByPk(activityId);
  broadcastActivityUpdate(activityId, 'LEAVE', { participantsCount: updated.participantsCount });

  return {
    activityId,
    status: 'CANCELLED',
    participantsCount: updated.participantsCount
  };
}

async function toggleSaveActivity(userId, activityId, isSave) {
  const activity = await Activity.findByPk(activityId);
  if (!activity) throw { status: 404, code: 'NOT_FOUND', error: 'Activity not found' };

  if (isSave) {
    await SavedItem.findOrCreate({
      where: { userId, targetType: 'ACTIVITY', targetId: activityId }
    });
  } else {
    await SavedItem.destroy({
      where: { userId, targetType: 'ACTIVITY', targetId: activityId }
    });
  }

  broadcastActivityUpdate(activityId, isSave ? 'SAVE' : 'UNSAVE');
  return { activityId, saved: isSave };
}

async function getRecommendedActivities(currentUserId) {
  // Recommend: high trust, verified, suitable right now, active
  const settings = currentUserId ? await UserSettings.findOne({ where: { userId: currentUserId } }) : null;
  const user = await User.findByPk(currentUserId);
  const userInterests = settings?.interestsJson || user?.interessi || [];

  const whereClause = { status: 'ACTIVE' };
  if (settings && settings.showVerifiedActivities) {
    whereClause.verifiedActivity = true;
  }

  const activities = await Activity.findAll({
    where: whereClause,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'authorTrustScore', 'verifiedProfile'] }
    ]
  });

  let filtered = activities;
  if (settings && settings.showOnlyReliableActivities) {
    filtered = activities.filter(a =>
      a.creator && ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'].includes(a.creator.authorTrustLevel)
    );
  }

  // Score
  const score = (a) => {
    let s = 0;
    if (a.verifiedActivity) s += 100;
    if (userInterests.map(i => i.toLowerCase()).includes(a.category.toLowerCase())) s += 50;
    s += (a.creator?.authorTrustScore || 40) * 2;
    s += (a.averageRating || 0) * 10;
    if (isSuitableWeather(a.category, a.difficulty)) s += 30;
    return s;
  };

  filtered.sort((a, b) => score(b) - score(a));
  const top = filtered.slice(0, 5);
  return Promise.all(top.map(a => serializeActivitySocial(a, currentUserId)));
}

async function getPerfectNowActivities(currentUserId) {
  // Returns activities suitable right now (weather, time, active)
  const settings = currentUserId ? await UserSettings.findOne({ where: { userId: currentUserId } }) : null;
  const whereClause = { status: 'ACTIVE' };
  if (settings && settings.showVerifiedActivities) {
    whereClause.verifiedActivity = true;
  }

  const activities = await Activity.findAll({
    where: whereClause,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'authorTrustScore', 'verifiedProfile'] }
    ]
  });

  let filtered = activities;
  if (settings && settings.showOnlyReliableActivities) {
    filtered = activities.filter(a =>
      a.creator && ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'].includes(a.creator.authorTrustLevel)
    );
  }

  const weatherFiltered = filtered.filter(a => isSuitableWeather(a.category, a.difficulty));
  // Sort by rating
  weatherFiltered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

  const top = weatherFiltered.slice(0, 5);
  return Promise.all(top.map(a => serializeActivitySocial(a, currentUserId)));
}

async function getRisingActivities(currentUserId) {
  const settings = currentUserId ? await UserSettings.findOne({ where: { userId: currentUserId } }) : null;
  const whereClause = { status: 'ACTIVE' };
  if (settings && settings.showVerifiedActivities) {
    whereClause.verifiedActivity = true;
  }

  const activities = await Activity.findAll({
    where: whereClause,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'authorTrustScore', 'verifiedProfile'] }
    ],
    order: [['risingScore', 'DESC']]
  });

  let filtered = activities;
  if (settings && settings.showOnlyReliableActivities) {
    filtered = activities.filter(a =>
      a.creator && ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'].includes(a.creator.authorTrustLevel)
    );
  }

  const top = filtered.slice(0, 5);
  return Promise.all(top.map(a => serializeActivitySocial(a, currentUserId)));
}

async function getVerifiedActivities(currentUserId) {
  const activities = await Activity.findAll({
    where: { status: 'ACTIVE', verifiedActivity: true },
    include: [
      { model: User, as: 'creator', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'authorTrustScore', 'verifiedProfile'] }
    ],
    limit: 10
  });

  return Promise.all(activities.map(a => serializeActivitySocial(a, currentUserId)));
}

module.exports = {
  listActivities,
  getActivitySocial,
  createActivitySocial,
  updateActivitySocial,
  deleteActivitySocial,
  joinActivitySocial,
  leaveActivitySocial,
  toggleSaveActivity,
  getRecommendedActivities,
  getPerfectNowActivities,
  getRisingActivities,
  getVerifiedActivities,
};
