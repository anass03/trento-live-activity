const { sequelize } = require('../db');

const User = require('./User')(sequelize);
const Activity = require('./Activity')(sequelize);
const Event = require('./Event')(sequelize);
const Participation = require('./Participation')(sequelize);
const POI = require('./POI')(sequelize);
const Report = require('./Report')(sequelize);
const DeviceToken = require('./DeviceToken')(sequelize);
const Consent = require('./Consent')(sequelize);
const CittadinoProfile = require('./CittadinoProfile')(sequelize);
const EnteProfile = require('./EnteProfile')(sequelize);
const AmministratoreComunaleProfile = require('./AmministratoreComunaleProfile')(sequelize);
const AmministratoreSistemaProfile = require('./AmministratoreSistemaProfile')(sequelize);
const EventParticipation = require('./EventParticipation')(sequelize);
const Favorite = require('./Favorite')(sequelize);
const RevokedToken = require('./RevokedToken')(sequelize);
const ServiceRequest = require('./ServiceRequest')(sequelize);
const Comment = require('./Comment')(sequelize);
const Reaction = require('./Reaction')(sequelize);
const Review = require('./Review')(sequelize);
const SavedItem = require('./SavedItem')(sequelize);
const SocialParticipation = require('./SocialParticipation')(sequelize);
const SocialReport = require('./SocialReport')(sequelize);
const UserSettings = require('./UserSettings')(sequelize);

// User <-> Activity (creator)
Activity.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });
User.hasMany(Activity, { foreignKey: 'creatorId', as: 'createdActivities' });

// User <-> Activity (participants via Participation)
Activity.belongsToMany(User, { through: Participation, foreignKey: 'activityId', as: 'participants' });
User.belongsToMany(Activity, { through: Participation, foreignKey: 'userId', as: 'joinedActivities' });
Participation.belongsTo(User, { foreignKey: 'userId' });
Participation.belongsTo(Activity, { foreignKey: 'activityId' });

// User (EnteCertificato) <-> Event
Event.belongsTo(User, { foreignKey: 'entityId', as: 'entity' });
User.hasMany(Event, { foreignKey: 'entityId', as: 'publishedEvents' });

// Event/Activity <-> Report (segnalazione polimorfica: eventId XOR activityId)
Report.belongsTo(User, { foreignKey: 'userId', as: 'reporter' });
Report.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Event.hasMany(Report, { foreignKey: 'eventId', as: 'reports' });
Report.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });
Activity.hasMany(Report, { foreignKey: 'activityId', as: 'reports' });

// POI associations
Activity.belongsTo(POI, { foreignKey: 'poiId', as: 'poi' });
Event.belongsTo(POI, { foreignKey: 'poiId', as: 'poi' });

// User <-> DeviceToken (FCM push)
DeviceToken.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(DeviceToken, { foreignKey: 'userId', as: 'deviceTokens' });

// User <-> Consent (GDPR RNF19)
Consent.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(Consent, { foreignKey: 'userId', as: 'consents' });

// User <-> Profili 1:1 separati per ruolo
// (tabelle separate per chiarezza del modello dati e privacy GDPR)
CittadinoProfile.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasOne(CittadinoProfile, { foreignKey: 'userId', as: 'cittadinoProfile' });

EnteProfile.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasOne(EnteProfile, { foreignKey: 'userId', as: 'enteProfile' });

AmministratoreComunaleProfile.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasOne(AmministratoreComunaleProfile, { foreignKey: 'userId', as: 'comunaleProfile' });

AmministratoreSistemaProfile.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasOne(AmministratoreSistemaProfile, { foreignKey: 'userId', as: 'sistemaProfile' });

// Event participation N:N — cittadini ↔ eventi certificati
Event.belongsToMany(User, { through: EventParticipation, foreignKey: 'eventId', as: 'eventParticipants' });
User.belongsToMany(Event, { through: EventParticipation, foreignKey: 'userId', as: 'joinedEvents' });
EventParticipation.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
EventParticipation.belongsTo(Event, { foreignKey: 'eventId', onDelete: 'CASCADE' });

// Favorites — polimorfico (markerType discrimina poi/activity/event)
Favorite.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });

// ServiceRequest — userId for dedup only, SET NULL on user deletion (GDPR)
ServiceRequest.belongsTo(User, { foreignKey: 'userId', onDelete: 'SET NULL' });
User.hasMany(ServiceRequest, { foreignKey: 'userId', as: 'serviceRequests' });

// ── Social layer (commenti, reazioni, salvataggi, recensioni, segnalazioni) ──
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
Comment.belongsTo(Event, { foreignKey: 'eventId', onDelete: 'CASCADE' });
Event.hasMany(Comment, { foreignKey: 'eventId', as: 'comments' });

Reaction.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
User.hasMany(Reaction, { foreignKey: 'userId', as: 'reactions' });

SavedItem.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
User.hasMany(SavedItem, { foreignKey: 'userId', as: 'savedItems' });

SocialParticipation.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
User.hasMany(SocialParticipation, { foreignKey: 'userId', as: 'socialParticipations' });

Review.belongsTo(User, { foreignKey: 'reviewerId', as: 'reviewer', onDelete: 'CASCADE' });
User.hasMany(Review, { foreignKey: 'reviewerId', as: 'writtenReviews' });

SocialReport.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter', onDelete: 'CASCADE' });
User.hasMany(SocialReport, { foreignKey: 'reporterId', as: 'socialReports' });

// Preferenze utente 1:1 (tema, lingua, notifiche…)
UserSettings.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasOne(UserSettings, { foreignKey: 'userId', as: 'settings' });

module.exports = {
  sequelize, User, Activity, Event, Participation, POI, Report, DeviceToken, Consent,
  CittadinoProfile, EnteProfile, AmministratoreComunaleProfile, AmministratoreSistemaProfile,
  EventParticipation, Favorite, RevokedToken, ServiceRequest,
  Comment, Reaction, Review, SavedItem, SocialParticipation, SocialReport, UserSettings,
};
