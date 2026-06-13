const { DataTypes } = require('sequelize');

const EVENT_CATEGORIES = ['sport', 'cultura', 'musica', 'cibo', 'outdoor', 'famiglia', 'arte', 'gastronomia', 'altro'];

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

    // ── Campi del layer social (socialEvents.service) — speculari ad Activity ──
    // Senza queste colonne ogni query/update del feed social (where status,
    // organizerId, startDateTime, increment likesCount…) fallisce a runtime.
    title: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(30), allowNull: true },
    locationName: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    organizerId: { type: DataTypes.UUID, allowNull: true },
    startDateTime: { type: DataTypes.DATE, allowNull: true },
    endDateTime: { type: DataTypes.DATE, allowNull: true },
    capacity: { type: DataTypes.INTEGER, allowNull: true },
    imageUrls: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    status: {
      type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'LIVE', 'ENDED', 'CANCELLED'),
      defaultValue: 'PUBLISHED',
    },
    isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
    participantsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    commentsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    savesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    sharesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'events',
    timestamps: true,
    hooks: {
      beforeSave: (event) => {
        // Map from new to old (titolo/categoria/entityId sono NOT NULL)
        if (event.title && !event.titolo) event.titolo = event.title;
        if (event.organizerId && !event.entityId) event.entityId = event.organizerId;
        if (event.capacity && !event.maxPartecipanti) event.maxPartecipanti = event.capacity;
        if (event.address && !event.indirizzo) event.indirizzo = event.address;
        if (event.description && !event.descrizione) event.descrizione = event.description;
        if (event.category && !event.categoria) {
          const lower = String(event.category).toLowerCase();
          event.categoria = EVENT_CATEGORIES.includes(lower) ? lower : 'altro';
        }
        if (event.startDateTime && !event.data) {
          const start = new Date(event.startDateTime);
          if (!Number.isNaN(start.getTime())) {
            event.data = start.toISOString().split('T')[0];
            event.orarioInizio = start.toISOString().split('T')[1].substring(0, 5);
          }
        }
        if (event.endDateTime && !event.orarioFine) {
          const end = new Date(event.endDateTime);
          if (!Number.isNaN(end.getTime())) {
            event.orarioFine = end.toISOString().split('T')[1].substring(0, 5);
          }
        }

        // Map from old to new (reverse)
        if (event.titolo && !event.title) event.title = event.titolo;
        if (event.entityId && !event.organizerId) event.organizerId = event.entityId;
        if (event.maxPartecipanti && !event.capacity) event.capacity = event.maxPartecipanti;
        if (event.indirizzo && !event.address) event.address = event.indirizzo;
        if (event.descrizione && !event.description) event.description = event.descrizione;
        if (event.categoria && !event.category) event.category = event.categoria.toUpperCase();
        if (event.data && !event.startDateTime) {
          const start = new Date(`${event.data}T${event.orarioInizio || '00:00'}:00Z`);
          if (!Number.isNaN(start.getTime())) event.startDateTime = start;
        }
        if (event.data && !event.endDateTime && event.orarioFine) {
          const end = new Date(`${event.data}T${event.orarioFine}:00Z`);
          if (!Number.isNaN(end.getTime())) event.endDateTime = end;
        }
      },
    },
  });
};

module.exports.EVENT_CATEGORIES = EVENT_CATEGORIES;
