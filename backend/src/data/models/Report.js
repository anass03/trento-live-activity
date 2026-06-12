const { DataTypes } = require('sequelize');

const REPORT_TYPES = ['contenuto_inappropriato', 'spam', 'disinformazione', 'contenuto_offensivo', 'altro'];

module.exports = (sequelize) => {
  return sequelize.define('Report', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    // Una segnalazione riguarda un evento OPPURE un'attività (mai entrambi):
    // due FK nullable evitano una tabella polimorfica separata.
    eventId: { type: DataTypes.UUID, allowNull: true },
    activityId: { type: DataTypes.UUID, allowNull: true },
    tipo: { type: DataTypes.ENUM(...REPORT_TYPES), allowNull: false },
    // OCL C23: stato = 'aperta' after registra()
    stato: {
      type: DataTypes.ENUM('aperta', 'in lavorazione', 'risolta'),
      defaultValue: 'aperta',
    },
    descrizione: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'reports',
    timestamps: true,
    // OCL C22: one report per user per event (idem per attività)
    indexes: [
      { unique: true, fields: ['userId', 'eventId'] },
      { unique: true, fields: ['userId', 'activityId'] },
    ],
  });
};
