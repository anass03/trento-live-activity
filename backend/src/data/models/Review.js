const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Review', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reviewerId: { type: DataTypes.UUID, allowNull: false },
    targetType: {
      type: DataTypes.ENUM('ACTIVITY', 'EVENT'),
      allowNull: false,
    },
    targetId: { type: DataTypes.UUID, allowNull: false },
    authorId: { type: DataTypes.UUID, allowNull: false },
    ratingOverall: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    ratingAccuracy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    ratingOrganization: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    ratingSafety: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    ratingAtmosphere: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: { type: DataTypes.TEXT, allowNull: true },
    isVerifiedParticipantReview: { type: DataTypes.BOOLEAN, defaultValue: false },
    reportedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    moderationStatus: {
      type: DataTypes.ENUM('VISIBLE', 'HIDDEN', 'UNDER_REVIEW'),
      defaultValue: 'VISIBLE',
    },
  }, {
    tableName: 'reviews',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['reviewerId', 'targetType', 'targetId'] }
    ]
  });
};
