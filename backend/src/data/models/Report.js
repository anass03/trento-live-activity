const { DataTypes } = require('sequelize');

const REPORT_TYPES = ['contenuto_inappropriato', 'spam', 'disinformazione', 'contenuto_offensivo', 'altro'];

module.exports = (sequelize) => {
  return sequelize.define('Report', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    eventId: { type: DataTypes.UUID, allowNull: false },
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
    // OCL C22: one report per user per event
    indexes: [{ unique: true, fields: ['userId', 'eventId'] }],
  });
};
