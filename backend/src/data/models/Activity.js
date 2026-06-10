const { DataTypes } = require('sequelize');

// RNF22: predefined types only — no free text
const ACTIVITY_TYPES = ['sport', 'cultura', 'musica', 'studio', 'arte', 'gastronomia'];
const ACTIVITY_STATUSES = ['attiva', 'cancellata', 'conclusa'];

module.exports = (sequelize) => {
  return sequelize.define('Activity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.ENUM(...ACTIVITY_TYPES), allowNull: true },
    data: { type: DataTypes.DATEONLY, allowNull: false },
    orarioInizio: { type: DataTypes.STRING(5), allowNull: false }, // HH:MM
    orarioFine: { type: DataTypes.STRING(5), allowNull: false },   // HH:MM
    // OCL C8: 2 <= maxPartecipanti <= 50 (allowNull: true now since we support capacity)
    maxPartecipanti: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 2, max: 50 },
    },
    stato: { type: DataTypes.ENUM(...ACTIVITY_STATUSES), defaultValue: 'attiva' },
    indirizzo: { type: DataTypes.STRING, allowNull: true },
    creatorId: { type: DataTypes.UUID, allowNull: true },
    latitudine: { type: DataTypes.FLOAT, allowNull: true },
    longitudine: { type: DataTypes.FLOAT, allowNull: true },
    poiId: { type: DataTypes.UUID, allowNull: true },
    
    // New fields
    title: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    imageUrls: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    category: {
      type: DataTypes.ENUM('OUTDOOR', 'CULTURE', 'FOOD', 'SPORT', 'RELAX', 'SOCIAL', 'FAMILY', 'NIGHTLIFE', 'OTHER'),
      defaultValue: 'OTHER',
    },
    tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    locationName: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    durationMinutes: { type: DataTypes.INTEGER, defaultValue: 60 },
    difficulty: {
      type: DataTypes.ENUM('EASY', 'MEDIUM', 'HARD'),
      defaultValue: 'MEDIUM',
    },
    priceType: {
      type: DataTypes.ENUM('FREE', 'PAID'),
      defaultValue: 'FREE',
    },
    priceLabel: { type: DataTypes.STRING, allowNull: true },
    authorId: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REPORTED', 'REMOVED'),
      defaultValue: 'ACTIVE',
    },
    capacity: { type: DataTypes.INTEGER, allowNull: true },
    participantsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    averageRating: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    verifiedActivity: { type: DataTypes.BOOLEAN, defaultValue: false },
    suitableNow: { type: DataTypes.BOOLEAN, defaultValue: true },
    risingScore: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    trustRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'activities',
    timestamps: true,
    hooks: {
      beforeSave: (activity) => {
        // Map from new to old
        if (activity.authorId && !activity.creatorId) activity.creatorId = activity.authorId;
        if (activity.capacity && !activity.maxPartecipanti) activity.maxPartecipanti = activity.capacity;
        if (activity.address && !activity.indirizzo) activity.indirizzo = activity.address;
        
        if (activity.status && !activity.stato) {
          const statusMap = {
            ACTIVE: 'attiva',
            CANCELLED: 'cancellata',
            COMPLETED: 'conclusa',
          };
          activity.stato = statusMap[activity.status] || 'attiva';
        }

        if (activity.category && !activity.tipo) {
          const categoryMap = {
            SPORT: 'sport',
            CULTURE: 'cultura',
            FOOD: 'gastronomia',
          };
          activity.tipo = categoryMap[activity.category] || 'cultura';
        }

        // Map from old to new (reverse)
        if (activity.creatorId && !activity.authorId) activity.authorId = activity.creatorId;
        if (activity.maxPartecipanti && !activity.capacity) activity.capacity = activity.maxPartecipanti;
        if (activity.indirizzo && !activity.address) {
          activity.address = activity.indirizzo;
          activity.locationName = activity.indirizzo;
        }

        if (activity.stato && !activity.status) {
          const revStatusMap = {
            attiva: 'ACTIVE',
            cancellata: 'CANCELLED',
            conclusa: 'COMPLETED',
          };
          activity.status = revStatusMap[activity.stato] || 'ACTIVE';
        }

        if (activity.tipo && !activity.category) {
          const revCategoryMap = {
            sport: 'SPORT',
            cultura: 'CULTURE',
            musica: 'CULTURE',
            studio: 'CULTURE',
            arte: 'CULTURE',
            gastronomia: 'FOOD',
          };
          activity.category = revCategoryMap[activity.tipo] || 'OTHER';
        }

        // Ensure title is set
        if (!activity.title && activity.tipo) {
          activity.title = `Attività di ${activity.tipo}`;
        }
      }
    }
  });
};

module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
