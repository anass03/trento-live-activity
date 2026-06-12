const { Event, User, Reaction, SavedItem, SocialParticipation, Comment, POI, UserSettings, sequelize } = require('../data/models');
const { Op } = require('sequelize');
const { broadcastEventUpdate } = require('./sse');

// Simple profanity/spam filter
function containsProfanity(text) {
  const blacklist = [/cazzo/i, /stronzo/i, /merda/i, /vaffanculo/i];
  return blacklist.some(regex => regex.test(text));
}

// Haversine formula to calculate distance in km between two coordinates
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

async function serializeEventSocial(event, currentUserId = null) {
  const item = event.toJSON ? event.toJSON() : { ...event };
  
  // Organizer details
  const organizer = item.entity || item.organizer || null;
  item.organizer = organizer ? {
    id: organizer.id,
    name: `${organizer.nome} ${organizer.cognome}`.trim(),
    avatarUrl: organizer.avatarUrl || null,
    authorTrustLevel: organizer.authorTrustLevel || 'NEW',
    verifiedProfile: !!organizer.verifiedProfile,
  } : null;

  // Add default properties if null
  item.imageUrls = item.imageUrls || [];
  item.participantsCount = item.participantsCount || 0;
  item.likesCount = item.likesCount || 0;
  item.commentsCount = item.commentsCount || 0;
  item.savesCount = item.savesCount || 0;
  item.sharesCount = item.sharesCount || 0;

  // Map to target shape properties for frontends
  item.title = item.title || item.titolo;
  item.description = item.description || item.descrizione || '';
  item.category = item.category || (item.categoria ? item.categoria.toUpperCase() : 'OTHER');
  item.address = item.address || item.indirizzo;
  item.capacity = item.capacity || item.maxPartecipanti;

  // Legacy mappings
  item.titolo = item.title;
  item.descrizione = item.description;
  item.categoria = item.category.toLowerCase();
  item.maxPartecipanti = item.capacity;
  item.indirizzo = item.address;
  item.isCertified = !!item.badgeVerifica;
  item.badgeVerifica = !!item.badgeVerifica;
  item.latitude = item.latitudine;
  item.longitude = item.longitudine;

  const start = item.startDateTime || (item.data && item.orarioInizio ? new Date(`${item.data}T${item.orarioInizio}:00Z`) : new Date());
  const end = item.endDateTime || (item.data && item.orarioFine ? new Date(`${item.data}T${item.orarioFine}:00Z`) : new Date());
  
  item.startTime = item.orarioInizio || start.toISOString().split('T')[1].substring(0, 5);
  item.endTime = item.orarioFine || end.toISOString().split('T')[1].substring(0, 5);
  item.dateTime = `${start.toISOString().split('T')[0]}T${item.startTime}:00`;
  item.location = item.locationName || item.address;

  // Fetch participant ids
  const participations = await SocialParticipation.findAll({
    where: { targetType: 'EVENT', targetId: item.id, status: 'JOINED' },
    attributes: ['userId']
  });
  item.participantIds = participations.map(p => p.userId);
  item.participantCount = item.participantsCount;

  // Entity legacy object
  item.entity = organizer ? {
    id: organizer.id,
    name: organizer.nomeEnte || `${organizer.nome} ${organizer.cognome}`.trim()
  } : null;

  // User flags
  if (currentUserId) {
    const [liked, saved, joined] = await Promise.all([
      Reaction.findOne({ where: { userId: currentUserId, targetType: 'EVENT', targetId: item.id } }),
      SavedItem.findOne({ where: { userId: currentUserId, targetType: 'EVENT', targetId: item.id } }),
      SocialParticipation.findOne({ where: { userId: currentUserId, targetType: 'EVENT', targetId: item.id, status: 'JOINED' } }),
    ]);
    item.likedByMe = !!liked;
    item.savedByMe = !!saved;
    item.joinedByMe = !!joined;
  } else {
    item.likedByMe = false;
    item.savedByMe = false;
    item.joinedByMe = false;
  }

  return item;
}

async function listEventsFeed(currentUserId, query) {
  const settings = currentUserId ? await UserSettings.findOne({ where: { userId: currentUserId } }) : null;
  const {
    category,
    date,
    liveNow,
    featured,
    nearby,
    search,
    organizerId,
    sortBy = 'newest',
    page = 1,
    limit = 10,
    lat,
    lng,
  } = query;

  const where = {};
  
  // Status check (only active/published events in feed)
  where.status = { [Op.in]: ['PUBLISHED', 'LIVE', 'ENDED'] };

  // Category filter
  if (category) {
    where.category = category;
  }

  // Date filter (starts on or after today)
  if (date) {
    where.startDateTime = { [Op.gte]: new Date(date) };
  }

  // Live Now filter
  if (liveNow === 'true') {
    const now = new Date();
    where.startDateTime = { [Op.lte]: now };
    where.endDateTime = { [Op.gte]: now };
    where.status = { [Op.in]: ['PUBLISHED', 'LIVE'] };
  }

  // Featured filter
  if (featured === 'true') {
    where.isFeatured = true;
  }

  // Organizer filter
  if (organizerId) {
    where.organizerId = organizerId;
  }

  // Search filter
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { locationName: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Query database
  let events = await Event.findAll({
    where,
    include: [
      { model: User, as: 'entity', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'verifiedProfile'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] }
    ],
    order: [['createdAt', 'DESC']], // We sort in-memory later if specific logic applies
  });

  // Filter by reliability settings preference
  if (settings?.showOnlyReliableActivities) {
    events = events.filter(e =>
      e.entity && ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'].includes(e.entity.authorTrustLevel)
    );
  }

  // Nearby distance filtering in memory
  if (nearby === 'true' && lat && lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    events = events.filter(event => {
      if (event.latitudine && event.longitudine) {
        const dist = getDistance(latitude, longitude, event.latitudine, event.longitudine);
        event.distance = dist;
        return dist <= 10; // Within 10 km radius
      }
      return false;
    });
  }

  // Sorting
  if (sortBy === 'startTime') {
    events.sort((a, b) => new Date(a.startDateTime || a.createdAt) - new Date(b.startDateTime || b.createdAt));
  } else if (sortBy === 'trending') {
    // Score based on popularity counts
    const score = (e) => (e.likesCount * 2) + (e.commentsCount * 3) + (e.participantsCount * 5) + (e.savesCount * 1);
    events.sort((a, b) => score(b) - score(a));
  } else if (sortBy === 'participants') {
    events.sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0));
  } else if (sortBy === 'relevance') {
    // Featured first, then nearby distance, then newest
    const score = (e) => {
      let s = 0;
      if (e.isFeatured) s += 1000;
      if (e.distance) s += Math.max(0, 100 - e.distance * 10); // Closer = higher score
      s += (new Date(e.createdAt).getTime() / 10000000); // Newest adds fraction
      return s;
    };
    events.sort((a, b) => score(b) - score(a));
  } else {
    // default: newest
    events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Manual pagination
  const total = events.length;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const offset = (p - 1) * l;
  const paginatedEvents = events.slice(offset, offset + l);

  // Serialize results
  const serialized = await Promise.all(
    paginatedEvents.map(e => serializeEventSocial(e, currentUserId))
  );

  return {
    events: serialized,
    total,
    page: p,
    limit: l
  };
}

async function getEventSocial(currentUserId, eventId) {
  const event = await Event.findByPk(eventId, {
    include: [
      { model: User, as: 'entity', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'verifiedProfile'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] }
    ]
  });
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  // Increment views
  await event.increment('views', { by: 1 }).catch(() => {});

  const serialized = await serializeEventSocial(event, currentUserId);

  // Add comments preview
  const comments = await Comment.findAll({
    where: { eventId, parentCommentId: null, moderationStatus: 'VISIBLE' },
    include: [{ model: User, as: 'user', attributes: ['id', 'nome', 'cognome', 'avatarUrl'] }],
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  serialized.commentsPreview = comments;
  return serialized;
}

async function createEventSocial(userId, payload) {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, code: 'NOT_FOUND', error: 'User not found' };

  // Only certified entities, moderators, or admins can publish
  const allowed = ['EnteCertificato', 'AmministratoreComunale', 'AmministratoreDiSistema'];
  if (!allowed.includes(user.ruolo)) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to publish events' };
  }

  const { title, description, category, locationName, address, latitude, longitude, startDateTime, endDateTime, capacity, imageUrls } = payload;
  if (!title || !category || !startDateTime || !endDateTime) {
    throw { status: 400, code: 'MISSING_FIELDS', error: 'title, category, startDateTime, and endDateTime are required' };
  }

  const newEvent = await Event.create({
    title,
    description,
    category,
    locationName,
    address,
    latitudine: latitude,
    longitudine: longitude,
    startDateTime: new Date(startDateTime),
    endDateTime: new Date(endDateTime),
    organizerId: userId,
    capacity: capacity || null,
    imageUrls: imageUrls || [],
    status: 'PUBLISHED',
  });

  // Increment user published events count
  await user.increment('publishedActivitiesCount', { by: 1 }).catch(() => {});

  // Trigger real-time update
  broadcastEventUpdate(newEvent.id, 'CREATE', { title, category });

  return serializeEventSocial(newEvent, userId);
}

async function updateEventSocial(userId, eventId, updates, userRole) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  // Permission check: organizer, moderator, or admin
  const isOrganizer = event.organizerId === userId || event.entityId === userId;
  const isStaff = userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN';

  if (!isOrganizer && !isStaff) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to modify this event' };
  }

  // Restrict updates if live or has participants
  if (event.participantsCount > 0 && (updates.startDateTime || updates.locationName || updates.address)) {
    // In production we'd send notification alerts here.
  }

  const ALLOWED = ['title', 'description', 'category', 'locationName', 'address', 'latitude', 'longitude', 'startDateTime', 'endDateTime', 'capacity', 'imageUrls', 'status'];
  const filtered = {};
  ALLOWED.forEach(key => {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  });

  await event.update(filtered);
  return serializeEventSocial(event, userId);
}

async function deleteEventSocial(userId, eventId, userRole) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  const isOrganizer = event.organizerId === userId || event.entityId === userId;
  const isStaff = userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN';

  if (!isOrganizer && !isStaff) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to delete this event' };
  }

  // Soft delete / cancel
  await event.update({ status: 'CANCELLED' });

  // Update participant records
  await SocialParticipation.update(
    { status: 'CANCELLED', cancelledAt: new Date() },
    { where: { targetType: 'EVENT', targetId: eventId, status: 'JOINED' } }
  );

  broadcastEventUpdate(eventId, 'CANCEL');
  return { message: 'Event cancelled successfully' };
}

async function joinEventSocial(userId, eventId) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  if (event.status === 'CANCELLED') {
    throw { status: 400, code: 'EVENT_CANCELLED', error: 'Cannot join a cancelled event' };
  }

  // Check capacity
  let status = 'JOINED';
  if (event.capacity) {
    if (event.participantsCount >= event.capacity) {
      status = 'WAITLISTED';
    }
  }

  const [participation, created] = await SocialParticipation.findOrCreate({
    where: { userId, targetType: 'EVENT', targetId: eventId },
    defaults: { status, joinedAt: new Date() }
  });

  if (!created) {
    if (participation.status === 'JOINED' || participation.status === 'WAITLISTED') {
      throw { status: 409, code: 'ALREADY_PARTICIPATING', error: 'Already registered for this event' };
    }
    await participation.update({ status, joinedAt: new Date(), cancelledAt: null });
  }

  if (status === 'JOINED') {
    await event.increment('participantsCount', { by: 1 });
  }

  const updatedEvent = await Event.findByPk(eventId);
  broadcastEventUpdate(eventId, 'JOIN', { participantsCount: updatedEvent.participantsCount });

  return {
    eventId,
    status,
    participantsCount: updatedEvent.participantsCount
  };
}

async function leaveEventSocial(userId, eventId) {
  const participation = await SocialParticipation.findOne({
    where: { userId, targetType: 'EVENT', targetId: eventId, status: { [Op.in]: ['JOINED', 'WAITLISTED'] } }
  });

  if (!participation) {
    throw { status: 404, code: 'NOT_PARTICIPATING', error: 'No active participation found' };
  }

  const previousStatus = participation.status;
  await participation.update({ status: 'CANCELLED', cancelledAt: new Date() });

  const event = await Event.findByPk(eventId);
  if (previousStatus === 'JOINED' && event.participantsCount > 0) {
    await event.decrement('participantsCount', { by: 1 });
  }

  const updatedEvent = await Event.findByPk(eventId);
  broadcastEventUpdate(eventId, 'LEAVE', { participantsCount: updatedEvent.participantsCount });

  return {
    eventId,
    status: 'CANCELLED',
    participantsCount: updatedEvent.participantsCount
  };
}

async function toggleLikeEvent(userId, eventId, isLike) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  if (isLike) {
    const [like, created] = await Reaction.findOrCreate({
      where: { userId, targetType: 'EVENT', targetId: eventId, type: 'LIKE' }
    });
    if (created) {
      await event.increment('likesCount', { by: 1 });
    }
  } else {
    const deleted = await Reaction.destroy({
      where: { userId, targetType: 'EVENT', targetId: eventId, type: 'LIKE' }
    });
    if (deleted && event.likesCount > 0) {
      await event.decrement('likesCount', { by: 1 });
    }
  }

  const updatedEvent = await Event.findByPk(eventId);
  broadcastEventUpdate(eventId, isLike ? 'LIKE' : 'UNLIKE', { likesCount: updatedEvent.likesCount });

  return { eventId, liked: isLike, likesCount: updatedEvent.likesCount };
}

async function toggleSaveEvent(userId, eventId, isSave) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  if (isSave) {
    const [save, created] = await SavedItem.findOrCreate({
      where: { userId, targetType: 'EVENT', targetId: eventId }
    });
    if (created) {
      await event.increment('savesCount', { by: 1 });
    }
  } else {
    const deleted = await SavedItem.destroy({
      where: { userId, targetType: 'EVENT', targetId: eventId }
    });
    if (deleted && event.savesCount > 0) {
      await event.decrement('savesCount', { by: 1 });
    }
  }

  const updatedEvent = await Event.findByPk(eventId);
  broadcastEventUpdate(eventId, isSave ? 'SAVE' : 'UNSAVE', { savesCount: updatedEvent.savesCount });

  return { eventId, saved: isSave, savesCount: updatedEvent.savesCount };
}

async function shareEvent(eventId) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  await event.increment('sharesCount', { by: 1 });

  const shareableUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/eventi/${eventId}`;
  broadcastEventUpdate(eventId, 'SHARE', { sharesCount: event.sharesCount + 1 });

  return {
    eventId,
    sharesCount: event.sharesCount + 1,
    shareableUrl
  };
}

async function listComments(eventId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { rows, count } = await Comment.findAndCountAll({
    where: { eventId, parentCommentId: null, moderationStatus: 'VISIBLE' },
    include: [{ model: User, as: 'user', attributes: ['id', 'nome', 'cognome', 'avatarUrl'] }],
    order: [['createdAt', 'ASC']],
    limit,
    offset
  });

  // Fetch replies
  const commentsWithReplies = await Promise.all(rows.map(async (comment) => {
    const replies = await Comment.findAll({
      where: { parentCommentId: comment.id, moderationStatus: 'VISIBLE' },
      include: [{ model: User, as: 'user', attributes: ['id', 'nome', 'cognome', 'avatarUrl'] }],
      order: [['createdAt', 'ASC']]
    });
    const item = comment.toJSON();
    item.replies = replies;
    return item;
  }));

  return {
    comments: commentsWithReplies,
    total: count,
    page,
    limit
  };
}

async function createComment(userId, eventId, { body, parentCommentId }) {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, code: 'NOT_FOUND', error: 'Event not found' };

  if (!body || body.trim().length === 0) {
    throw { status: 400, code: 'INVALID_COMMENT', error: 'Comment body cannot be empty' };
  }

  if (containsProfanity(body)) {
    throw { status: 400, code: 'PROFANITY_REJECTED', error: 'Comment contains inappropriate language' };
  }

  const comment = await Comment.create({
    userId,
    eventId,
    body,
    parentCommentId: parentCommentId || null,
    moderationStatus: 'VISIBLE'
  });

  await event.increment('commentsCount', { by: 1 });

  const fullComment = await Comment.findByPk(comment.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'nome', 'cognome', 'avatarUrl'] }]
  });

  broadcastEventUpdate(eventId, 'COMMENT', { commentsCount: event.commentsCount + 1 });

  return fullComment;
}

async function updateComment(userId, commentId, { body }, userRole) {
  const comment = await Comment.findByPk(commentId);
  if (!comment) throw { status: 404, code: 'NOT_FOUND', error: 'Comment not found' };

  const isAuthor = comment.userId === userId;
  const isStaff = userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN';

  if (!isAuthor && !isStaff) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to edit this comment' };
  }

  if (containsProfanity(body)) {
    throw { status: 400, code: 'PROFANITY_REJECTED', error: 'Comment contains inappropriate language' };
  }

  await comment.update({ body });
  return comment;
}

async function deleteComment(userId, commentId, userRole) {
  const comment = await Comment.findByPk(commentId);
  if (!comment) throw { status: 404, code: 'NOT_FOUND', error: 'Comment not found' };

  const isAuthor = comment.userId === userId;
  const isStaff = userRole === 'AmministratoreComunale' || userRole === 'AmministratoreDiSistema' || userRole === 'MODERATOR' || userRole === 'ADMIN';

  if (!isAuthor && !isStaff) {
    throw { status: 403, code: 'FORBIDDEN', error: 'Unauthorized to delete this comment' };
  }

  // Soft delete comment
  await comment.update({ moderationStatus: 'HIDDEN', deletedAt: new Date() });

  const event = await Event.findByPk(comment.eventId);
  if (event && event.commentsCount > 0) {
    await event.decrement('commentsCount', { by: 1 });
  }

  return { message: 'Comment deleted successfully' };
}

async function getTrendingEvents(currentUserId) {
  const settings = currentUserId ? await UserSettings.findOne({ where: { userId: currentUserId } }) : null;
  const events = await Event.findAll({
    where: { status: { [Op.in]: ['PUBLISHED', 'LIVE'] } },
    include: [
      { model: User, as: 'entity', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'verifiedProfile'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] }
    ]
  });

  let filtered = events;
  if (settings && settings.showOnlyReliableActivities) {
    filtered = events.filter(e =>
      e.entity && ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'].includes(e.entity.authorTrustLevel)
    );
  }

  const score = (e) => (e.likesCount * 2) + (e.commentsCount * 3) + (e.participantsCount * 5) + (e.savesCount * 1);
  filtered.sort((a, b) => score(b) - score(a));

  const top = filtered.slice(0, 10);
  return Promise.all(top.map(e => serializeEventSocial(e, currentUserId)));
}

async function getNextEvent(currentUserId) {
  // Finds the next upcoming event
  const settings = currentUserId ? await UserSettings.findOne({ where: { userId: currentUserId } }) : null;
  const events = await Event.findAll({
    where: {
      status: 'PUBLISHED',
      startDateTime: { [Op.gt]: new Date() }
    },
    include: [
      { model: User, as: 'entity', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'verifiedProfile'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] }
    ],
    order: [['startDateTime', 'ASC']],
    limit: 10
  });

  let filtered = events;
  if (settings && settings.showOnlyReliableActivities) {
    filtered = events.filter(e =>
      e.entity && ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'].includes(e.entity.authorTrustLevel)
    );
  }

  if (filtered.length === 0) return null;
  return serializeEventSocial(filtered[0], currentUserId);
}

async function getLiveEvents(currentUserId) {
  const settings = currentUserId ? await UserSettings.findOne({ where: { userId: currentUserId } }) : null;
  const now = new Date();
  const events = await Event.findAll({
    where: {
      status: { [Op.in]: ['PUBLISHED', 'LIVE'] },
      startDateTime: { [Op.lte]: now },
      endDateTime: { [Op.gte]: now }
    },
    include: [
      { model: User, as: 'entity', attributes: ['id', 'nome', 'cognome', 'avatarUrl', 'authorTrustLevel', 'verifiedProfile'] },
      { model: POI, as: 'poi', attributes: ['id', 'nome'] }
    ]
  });

  let filtered = events;
  if (settings && settings.showOnlyReliableActivities) {
    filtered = events.filter(e =>
      e.entity && ['RELIABLE', 'HIGHLY_RELIABLE', 'VERIFIED'].includes(e.entity.authorTrustLevel)
    );
  }

  return Promise.all(filtered.map(e => serializeEventSocial(e, currentUserId)));
}

module.exports = {
  listEventsFeed,
  getEventSocial,
  createEventSocial,
  updateEventSocial,
  deleteEventSocial,
  joinEventSocial,
  leaveEventSocial,
  toggleLikeEvent,
  toggleSaveEvent,
  shareEvent,
  listComments,
  createComment,
  updateComment,
  deleteComment,
  getTrendingEvents,
  getNextEvent,
  getLiveEvents,
};
