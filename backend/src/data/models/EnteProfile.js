const { DataTypes } = require('sequelize');

// Profilo ente certificato: dati istituzionali 1:1 con un User di ruolo EnteCertificato.
// Separa identità di login da denominazione, PEC e stato di approvazione.
module.exports = (sequelize) => sequelize.define('EnteProfile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  nomeEnte: { type: DataTypes.STRING, allowNull: false, unique: true },
  pec: { type: DataTypes.STRING, allowNull: false, unique: true },
  approvato: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Note interne di approvazione/rifiuto compilate dall'admin
  noteAdmin: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'ente_profiles',
  timestamps: true,
});
