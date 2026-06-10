const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Comment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    eventId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    parentCommentId: { type: DataTypes.UUID, allowNull: true },
    moderationStatus: {
      type: DataTypes.ENUM('VISIBLE', 'HIDDEN', 'UNDER_REVIEW'),
      defaultValue: 'VISIBLE',
    },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'comments',
    timestamps: true,
  });
};
