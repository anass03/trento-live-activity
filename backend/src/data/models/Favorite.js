const { DataTypes } = require('sequelize');

// Preferiti: ogni cittadino può marcare POI, attività ed eventi come "preferiti".
// La FK userId è cascade-on-delete (vedi index.js). markerType è una enum di 3 valori.
module.exports = (sequelize) => sequelize.define('Favorite', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  markerType: {
    type: DataTypes.ENUM('poi', 'activity', 'event'),
    allowNull: false,
  },
  markerId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'favorites',
  timestamps: true,
  indexes: [
    // Un utente non può "preferire" lo stesso marker due volte
    { unique: true, fields: ['userId', 'markerType', 'markerId'] },
    { fields: ['userId'] },
  ],
});
