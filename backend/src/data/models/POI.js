const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('POI', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nome: { type: DataTypes.STRING, allowNull: false },
    latitudine: { type: DataTypes.FLOAT, allowNull: false },
    longitudine: { type: DataTypes.FLOAT, allowNull: false },
    // OCL C20: capacitaMax > 0
    capacitaMax: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    // OCL C21: statoAffollamento in {verde, giallo, rosso}
    statoAffollamento: {
      type: DataTypes.ENUM('verde', 'giallo', 'rosso'),
      defaultValue: 'verde',
    },
    tipo: { type: DataTypes.STRING, allowNull: true },
    descrizione: { type: DataTypes.TEXT, allowNull: true },
    indirizzo: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'pois',
    timestamps: true,
  });
};
