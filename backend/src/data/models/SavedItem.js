const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SavedItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    targetType: {
      type: DataTypes.ENUM('EVENT', 'ACTIVITY'),
      allowNull: false,
    },
    targetId: { type: DataTypes.UUID, allowNull: false },
  }, {
    tableName: 'saved_items',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'targetType', 'targetId'] }
    ]
  });
};
