const { DataTypes } = require('sequelize');

const EVENT_CATEGORIES = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'altro'];

module.exports = (sequelize) => {
  return sequelize.define('Event', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // OCL C17: non-empty, <= 100 chars
    titolo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: [1, 100] },
    },
    descrizione: { type: DataTypes.TEXT, allowNull: true },
    categoria: { type: DataTypes.ENUM(...EVENT_CATEGORIES), allowNull: false },
    // OCL C16: true after pubblica()
    badgeVerifica: { type: DataTypes.BOOLEAN, defaultValue: true },
    entityId: { type: DataTypes.UUID, allowNull: false },
    latitudine: { type: DataTypes.FLOAT, allowNull: true },
    longitudine: { type: DataTypes.FLOAT, allowNull: true },
    poiId: { type: DataTypes.UUID, allowNull: true },
    data: { type: DataTypes.DATEONLY, allowNull: true },
    orarioInizio: { type: DataTypes.STRING(5), allowNull: true },
    orarioFine: { type: DataTypes.STRING(5), allowNull: true },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    // Capienza massima opzionale. null = evento aperto a tutti senza limite.
    // Quando valorizzato, il backend rifiuta nuove partecipazioni una volta raggiunto.
    maxPartecipanti: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
    indirizzo: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'events',
    timestamps: true,
  });
};

module.exports.EVENT_CATEGORIES = EVENT_CATEGORIES;
