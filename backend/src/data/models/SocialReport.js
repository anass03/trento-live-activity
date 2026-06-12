const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SocialReport', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reporterId: { type: DataTypes.UUID, allowNull: false },
    targetType: {
      type: DataTypes.ENUM('USER', 'EVENT', 'ACTIVITY', 'COMMENT', 'REVIEW'),
      allowNull: false,
    },
    targetId: { type: DataTypes.UUID, allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('OPEN', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN'),
      defaultValue: 'OPEN',
    },
  }, {
    tableName: 'social_reports',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['reporterId', 'targetType', 'targetId'] }
    ]
  });
};
