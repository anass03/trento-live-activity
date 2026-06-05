const { DataTypes } = require('sequelize');

const SERVICE_REQUEST_CATEGORIES = [
  'parcheggio_auto',
  'parcheggio_bici',
  'sport',
  'studio',
  'verde',
  'cultura',
  'ciclismo',
  'altro',
];

module.exports = (sequelize) => {
  return sequelize.define('ServiceRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    categoria: { type: DataTypes.ENUM(...SERVICE_REQUEST_CATEGORIES), allowNull: false },
    latitudine: { type: DataTypes.FLOAT, allowNull: false },
    longitudine: { type: DataTypes.FLOAT, allowNull: false },
    // userId stored only for dedup — never exposed to operators (scope ridotto #15 / GDPR)
    userId: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'service_requests',
    timestamps: true,
    updatedAt: false,
  });
};

module.exports.SERVICE_REQUEST_CATEGORIES = SERVICE_REQUEST_CATEGORIES;
