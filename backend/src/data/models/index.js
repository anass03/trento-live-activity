const { sequelize } = require('../db');

const User = require('./User')(sequelize);
const Activity = require('./Activity')(sequelize);
const Event = require('./Event')(sequelize);
const Participation = require('./Participation')(sequelize);
const POI = require('./POI')(sequelize);
const Report = require('./Report')(sequelize);
const DeviceToken = require('./DeviceToken')(sequelize);
const Consent = require('./Consent')(sequelize);

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

// Event <-> Report
Report.belongsTo(User, { foreignKey: 'userId', as: 'reporter' });
Report.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Event.hasMany(Report, { foreignKey: 'eventId', as: 'reports' });

// POI associations
Activity.belongsTo(POI, { foreignKey: 'poiId', as: 'poi' });
Event.belongsTo(POI, { foreignKey: 'poiId', as: 'poi' });

// User <-> DeviceToken (FCM push)
DeviceToken.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(DeviceToken, { foreignKey: 'userId', as: 'deviceTokens' });

// User <-> Consent (GDPR RNF19)
Consent.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(Consent, { foreignKey: 'userId', as: 'consents' });

module.exports = { sequelize, User, Activity, Event, Participation, POI, Report, DeviceToken, Consent };
