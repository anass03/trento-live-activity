const { DataTypes } = require('sequelize');

// Profilo amministratore comunale: tiene gli identificativi SPID e i metadati
// specifici del ruolo municipal_admin (OCL C4: SPID-only).
module.exports = (sequelize) => sequelize.define('AmministratoreComunaleProfile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  spidId: { type: DataTypes.STRING, allowNull: true, unique: true },
  ufficio: { type: DataTypes.STRING, allowNull: true },
  nome: { type: DataTypes.STRING, allowNull: false },
  cognome: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'amministratore_comunale_profiles',
  timestamps: true,
});
