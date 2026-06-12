const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Reaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    targetType: {
      type: DataTypes.ENUM('EVENT', 'ACTIVITY', 'COMMENT'),
      allowNull: false,
    },
    targetId: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.ENUM('LIKE'),
      defaultValue: 'LIKE',
    },
  }, {
    tableName: 'reactions',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'targetType', 'targetId'] }
    ]
  });
};
