const { DataTypes } = require('sequelize');

// RNF19 — GDPR art. 7: track explicit consent given by users.
// Types: 'privacy_policy', 'terms_of_service', 'marketing', 'analytics'.
module.exports = (sequelize) => {
  return sequelize.define('Consent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.ENUM('privacy_policy', 'terms_of_service', 'marketing', 'analytics'),
      allowNull: false,
    },
    version: { type: DataTypes.STRING, allowNull: false, defaultValue: '1.0' },
    granted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    grantedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'consents',
    timestamps: true,
  });
};
