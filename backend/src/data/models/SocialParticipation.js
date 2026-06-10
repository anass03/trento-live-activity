const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SocialParticipation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    targetType: {
      type: DataTypes.ENUM('EVENT', 'ACTIVITY'),
      allowNull: false,
    },
    targetId: { type: DataTypes.UUID, allowNull: false },
    status: {
      type: DataTypes.ENUM('JOINED', 'CANCELLED', 'ATTENDED', 'NO_SHOW', 'WAITLISTED'),
      defaultValue: 'JOINED',
    },
    joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
    attendedConfirmedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'social_participations',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'targetType', 'targetId'] }
    ]
  });
};
