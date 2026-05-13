const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: { type: DataTypes.STRING, allowNull: true },
    nome: { type: DataTypes.STRING, allowNull: false },
    cognome: { type: DataTypes.STRING, allowNull: false },
    dataNascita: { type: DataTypes.DATEONLY, allowNull: false },
    ruolo: {
      type: DataTypes.ENUM(
        'UtenteRegistrato',
        'EnteCertificato',
        'AmministratoreComunale',
        'AmministratoreDiSistema'
      ),
      defaultValue: 'UtenteRegistrato',
    },
    interessi: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    // EnteCertificato only
    approvato: { type: DataTypes.BOOLEAN, defaultValue: false },
    nomeEnte: { type: DataTypes.STRING, allowNull: true },
    // AmministratoreDiSistema only
    twoFactorSecret: { type: DataTypes.STRING, allowNull: true },
    twoFactorEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    // 2FA recovery codes (SHA-256 hashes of one-time codes). Plain codes are
    // shown to the user only once at setup/regeneration.
    twoFactorRecoveryCodes: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    // Password reset (RF8)
    passwordResetToken: { type: DataTypes.STRING, allowNull: true },
    passwordResetExpires: { type: DataTypes.DATE, allowNull: true },
    // Last known position (RF40 — geo-aware push notifications)
    lastLat: { type: DataTypes.FLOAT, allowNull: true },
    lastLng: { type: DataTypes.FLOAT, allowNull: true },
    lastLocationAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'users',
    timestamps: true,
  });
};
