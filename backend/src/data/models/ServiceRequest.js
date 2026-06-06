const { DataTypes } = require('sequelize');

// RNF22: predefined categories only — no free text
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

// RNF22: predefined subcategories per macro category.
// Categories with empty arrays (verde, altro) go straight to location step.
const SUBCATEGORIES_BY_CATEGORY = {
  parcheggio_auto: ['coperto', 'scoperto', 'disabili', 'carica_ev'],
  parcheggio_bici: ['rastrelliera', 'box_bici'],
  sport:           ['ping_pong', 'basket', 'calcetto', 'pallavolo', 'atletica', 'yoga', 'altro_sport'],
  studio:          ['biblioteca', 'coworking', 'sala_studio'],
  verde:           [],
  cultura:         ['teatro', 'cinema', 'museo', 'sala_prove'],
  ciclismo:        ['pista_ciclabile', 'pump_track'],
  altro:           [],
};

// Flat deduplicated list for the ENUM type
const ALL_SUBCATEGORIES = [...new Set(Object.values(SUBCATEGORIES_BY_CATEGORY).flat())];

module.exports = (sequelize) => {
  return sequelize.define('ServiceRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    categoria: { type: DataTypes.ENUM(...SERVICE_REQUEST_CATEGORIES), allowNull: false },
    // RNF22: predefined enum only, null when macro category has no subdivisions or citizen skips
    sottocategoria: { type: DataTypes.ENUM(...ALL_SUBCATEGORIES), allowNull: true },
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
module.exports.SUBCATEGORIES_BY_CATEGORY = SUBCATEGORIES_BY_CATEGORY;
module.exports.ALL_SUBCATEGORIES = ALL_SUBCATEGORIES;
