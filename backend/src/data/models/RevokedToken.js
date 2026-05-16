const { DataTypes } = require('sequelize');

// Token revocati al logout. Persistito su DB per sopravvivere ai riavvii del
// backend e per consentire revoca cross-istance in deployment multi-pod.
// `expiresAt` corrisponde alla naturale scadenza del JWT: dopo quel timestamp
// il token comunque non sarebbe più valido e la riga può essere pulita.
module.exports = (sequelize) => {
  return sequelize.define('RevokedToken', {
    jti: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    tableName: 'revoked_tokens',
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['expiresAt'] }],
  });
};
