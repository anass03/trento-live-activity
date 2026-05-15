const { DataTypes } = require('sequelize');

// Join table N:N tra User ed Event. Cittadini possono "partecipare" agli eventi
// certificati nello stesso modo in cui si iscrivono ad attività spontanee.
module.exports = (sequelize) => sequelize.define('EventParticipation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  eventId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'event_participations',
  timestamps: true,
  indexes: [
    // OCL: un utente non si iscrive due volte allo stesso evento
    { unique: true, fields: ['userId', 'eventId'] },
  ],
});
