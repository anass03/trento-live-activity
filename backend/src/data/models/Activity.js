const { DataTypes } = require('sequelize');

// RNF22: predefined types only — no free text
const ACTIVITY_TYPES = ['sport', 'cultura', 'musica', 'studio', 'arte', 'gastronomia'];
const ACTIVITY_STATUSES = ['attiva', 'cancellata', 'conclusa'];

module.exports = (sequelize) => {
  return sequelize.define('Activity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.ENUM(...ACTIVITY_TYPES), allowNull: false },
    data: { type: DataTypes.DATEONLY, allowNull: false },
    orarioInizio: { type: DataTypes.STRING(5), allowNull: false }, // HH:MM
    orarioFine: { type: DataTypes.STRING(5), allowNull: false },   // HH:MM
    // OCL C8: 2 <= maxPartecipanti <= 50
    maxPartecipanti: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 2, max: 50 },
    },
    stato: { type: DataTypes.ENUM(...ACTIVITY_STATUSES), defaultValue: 'attiva' },
    creatorId: { type: DataTypes.UUID, allowNull: false },
    latitudine: { type: DataTypes.FLOAT, allowNull: true },
    longitudine: { type: DataTypes.FLOAT, allowNull: true },
    poiId: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'activities',
    timestamps: true,
  });
};

module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
