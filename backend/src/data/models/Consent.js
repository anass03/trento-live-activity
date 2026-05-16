const { DataTypes } = require('sequelize');

// RNF19 — GDPR art. 7: track explicit consent given by users (audit-trail).
// type usa STRING (non ENUM) per essere estendibile senza ALTER TYPE su
// Postgres ad ogni nuovo tipo di preferenza (es. notif_email, notif_push).
// La validazione del valore avviene a livello service.
const VALID_TYPES = [
  'privacy_policy', 'terms_of_service', 'marketing', 'analytics',
  'notif_email', 'notif_push',
];

module.exports = (sequelize) => {
  return sequelize.define('Consent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isIn: [VALID_TYPES] },
    },
    version: { type: DataTypes.STRING, allowNull: false, defaultValue: '1.0' },
    granted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // grantedAt = quando l'utente ha registrato questa scelta (sempre valorizzato,
    // anche per revoche: è la data del record, non "la data del consenso attivo").
    grantedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'consents',
    timestamps: true,
  });
};

module.exports.VALID_TYPES = VALID_TYPES;
