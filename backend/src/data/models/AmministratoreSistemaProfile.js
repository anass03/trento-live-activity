const { DataTypes } = require('sequelize');

// Profilo amministratore di sistema: 2FA è obbligatoria (RNF15) ma resta su User
// per non duplicare la logica di login. Qui teniamo solo i metadati aggiuntivi.
module.exports = (sequelize) => sequelize.define('AmministratoreSistemaProfile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  nome: { type: DataTypes.STRING, allowNull: false },
  cognome: { type: DataTypes.STRING, allowNull: false },
  // Annotazioni interne / superadmin
  superAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'amministratore_sistema_profiles',
  timestamps: true,
});
