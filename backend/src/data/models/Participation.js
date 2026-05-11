const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Participation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    activityId: { type: DataTypes.UUID, allowNull: false },
  }, {
    tableName: 'participations',
    timestamps: true,
    // OCL C18: unique constraint — user can join an activity only once
    indexes: [{ unique: true, fields: ['userId', 'activityId'] }],
  });
};
